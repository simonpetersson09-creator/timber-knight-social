import { createServerFn } from "@tanstack/react-start";
import { Chess } from "chess.js";
import { z } from "zod";
import { INVITE_TTL_MS, LOBBY_TTL_MS, QUICK_WAIT_MS, MOVE_LIMIT_MS, moveDeadline, statsFor, type MatchRow } from "./online-rules";
import { Cred, PLAYER_COLS, allMatches, auth, finishGame, nameOf, notify, sweepGames, type DB } from "./server/core";

const GAME_COLS = "id, kind, status, host, invitee, white, black, code, pgn, fen, result, end_reason, draw_offer, last_move_at, reminded, expires_at, created_at";
const later = (ms: number) => new Date(Date.now() + ms).toISOString();
function lobbyCode() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return [...crypto.getRandomValues(new Uint8Array(6))].map((x) => a[x % a.length]).join("");
}
async function playerName(a: DB, id: string) {
  const { data } = await a.from("players").select("name, player_number").eq("id", id).maybeSingle();
  return nameOf(data);
}
/** Starts a waiting game: the inviting host always gets the mahogany (white) pieces. */
async function start(a: DB, gameId: string, host: string, guest: string) {
  const hostWhite = true;
  const { data } = await a.from("games").update({
    status: "active", white: hostWhite ? host : guest, black: hostWhite ? guest : host, invitee: guest,
    last_move_at: new Date().toISOString(), expires_at: later(MOVE_LIMIT_MS), updated_at: new Date().toISOString(),
  }).eq("id", gameId).eq("status", "waiting").select("id").maybeSingle();
  return !!data;
}

/** Home overview: my running games, waiting lobbies and invitations to me. */
export const myOnline = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    const { data: rows } = await a.from("games").select(GAME_COLS)
      .or(`white.eq.${me},black.eq.${me},host.eq.${me},invitee.eq.${me}`).in("status", ["waiting", "active"]).order("updated_at", { ascending: false }).limit(30);
    const list = rows ?? [];
    await sweepGames(a, list);
    const live = list.filter((g) => g.status === "waiting" || g.status === "active").filter((g) => !(g.kind === "quick" && g.status === "waiting"));
    const ids = [...new Set(live.flatMap((g) => [g.host, g.invitee, g.white, g.black]).filter((x): x is string => !!x && x !== me))];
    const { data: ps } = ids.length ? await a.from("players").select(PLAYER_COLS).in("id", ids) : { data: [] };
    return live.map((g) => {
      const oppId = [g.white, g.black, g.host, g.invitee].find((x) => x && x !== me) ?? null;
      const turn = new Chess(g.fen).turn();
      const myColor = g.white === me ? "w" : g.black === me ? "b" : null;
      return {
        id: g.id, kind: g.kind, status: g.status, code: g.code,
        role: g.status === "waiting" ? (g.host === me ? ("host" as const) : ("invited" as const)) : ("player" as const),
        myTurn: g.status === "active" && myColor === turn,
        opponent: (ps ?? []).find((p) => p.id === oppId) ?? null,
        expires_at: g.expires_at,
        moveNo: Number(g.fen.split(" ")[5] ?? 1),
      };
    });
  });

export const inviteFriend = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ friend: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    const { data: fr } = await a.from("friendships").select("id").eq("status", "accepted")
      .or(`and(requester.eq.${me},addressee.eq.${data.friend}),and(requester.eq.${data.friend},addressee.eq.${me})`).maybeSingle();
    if (!fr) throw new Error("not_friends");
    // Crossed invitations merge: if the friend already invited me, start that game.
    const { data: crossed } = await a.from("games").select("id").eq("kind", "invite").eq("status", "waiting").eq("host", data.friend).eq("invitee", me).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (crossed && (await start(a, crossed.id, data.friend, me))) {
      await notify(a, data.friend, "pushLobbyJoined", { name: await playerName(a, me) }, { game: crossed.id });
      return { id: crossed.id, merged: true };
    }
    const { data: existing } = await a.from("games").select("id").eq("kind", "invite").eq("status", "waiting").eq("host", me).eq("invitee", data.friend).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (existing) return { id: existing.id, merged: false };
    const { data: g, error } = await a.from("games").insert({ kind: "invite", host: me, invitee: data.friend, expires_at: later(INVITE_TTL_MS) }).select("id").single();
    if (error) throw new Error(error.message);
    await notify(a, data.friend, "pushInvite", { name: await playerName(a, me) }, { game: g.id });
    return { id: g.id, merged: false };
  });

export const createLobby = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    for (let i = 0; i < 5; i++) {
      const { data: g, error } = await a.from("games").insert({ kind: "lobby", host: me, code: lobbyCode(), expires_at: later(LOBBY_TTL_MS) }).select("id, code").single();
      if (!error) return g;
    }
    throw new Error("failed");
  });

/** Joins by lobby code, or accepts an invitation by game id. */
export const joinGame = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ code: z.string().trim().toUpperCase().optional(), gameId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    let q = a.from("games").select(GAME_COLS);
    q = data.gameId ? q.eq("id", data.gameId) : q.eq("code", data.code ?? "");
    const { data: g } = await q.maybeSingle();
    if (!g) return { result: "not_found" as const };
    await sweepGames(a, [g]);
    if (g.status === "active" && (g.white === me || g.black === me)) return { result: "ok" as const, id: g.id };
    if (g.status !== "waiting") return { result: "expired" as const };
    if (g.host === me) return { result: "ok" as const, id: g.id };
    if (g.kind === "invite" && g.invitee !== me) return { result: "not_found" as const };
    if (!(await start(a, g.id, g.host, me))) return { result: "expired" as const };
    await notify(a, g.host, "pushLobbyJoined", { name: await playerName(a, me) }, { game: g.id });
    return { result: "ok" as const, id: g.id };
  });

/** Declines an invitation, withdraws my own, or closes my lobby. */
export const cancelGame = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ gameId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    await a.from("games").update({ status: "expired" }).eq("id", data.gameId).eq("status", "waiting").or(`host.eq.${me},invitee.eq.${me}`);
    return { ok: true };
  });

/** Quick match: joins someone searching right now, otherwise starts searching. */
export const quickMatch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ gameId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    if (data.gameId) {
      const { data: g } = await a.from("games").select("status").eq("id", data.gameId).maybeSingle();
      return { id: data.gameId, status: g?.status ?? "expired" };
    }
    const { data: open } = await a.from("games").select("id, host").eq("kind", "quick").eq("status", "waiting").neq("host", me)
      .gt("expires_at", new Date().toISOString()).order("created_at").limit(3);
    for (const g of open ?? []) {
      if (await start(a, g.id, g.host, me)) return { id: g.id, status: "active" };
    }
    await a.from("games").update({ status: "expired" }).eq("kind", "quick").eq("status", "waiting").eq("host", me);
    const { data: g } = await a.from("games").insert({ kind: "quick", host: me, expires_at: later(QUICK_WAIT_MS + 5000) }).select("id").single();
    if (!g) throw new Error("quick_match_failed");
    return { id: g.id, status: "waiting" };
  });

export const getOnlineGame = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ gameId: z.string().uuid(), after: z.number().int().default(0) }).parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    const { data: g } = await a.from("games").select(GAME_COLS).eq("id", data.gameId).maybeSingle();
    if (!g || ![g.white, g.black, g.host, g.invitee].includes(me)) throw new Error("not_found");
    await sweepGames(a, [g]);
    const { data: fresh } = await a.from("games").select(GAME_COLS).eq("id", g.id).single();
    if (!fresh) throw new Error("not_found");
    const ids = [fresh.white, fresh.black, fresh.host].filter((x): x is string => !!x);
    const { data: ps } = await a.from("players").select(PLAYER_COLS).in("id", ids);
    const { data: chat } = await a.from("game_chat").select("id, player, phrase, created_at").eq("game_id", g.id).gt("id", data.after).order("id").limit(50);
    return { me, game: fresh, players: ps ?? [], chat: chat ?? [] };
  });

async function loadActive(a: DB, gameId: string, me: string) {
  const { data: g } = await a.from("games").select(GAME_COLS).eq("id", gameId).maybeSingle();
  if (!g || g.status !== "active" || (g.white !== me && g.black !== me)) throw new Error("not_active");
  return { g, color: (g.white === me ? "w" : "b") as "w" | "b" };
}

/** The server decides every move (cheat-proof). */
export const makeMove = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ gameId: z.string().uuid(), from: z.string().length(2), to: z.string().length(2), promotion: z.enum(["q", "r", "b", "n"]).optional() }).parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    const { g, color } = await loadActive(a, data.gameId, me);
    if (moveDeadline(new Date(g.last_move_at).getTime(), Date.now()) === "timeout") {
      await finishGame(a, g, new Chess(g.fen).turn() === "w" ? "b" : "w", "timeout");
      return { ok: false };
    }
    const c = new Chess();
    if (g.pgn) c.loadPgn(g.pgn);
    if (c.turn() !== color) return { ok: false };
    try { c.move({ from: data.from, to: data.to, ...(data.promotion ? { promotion: data.promotion } : {}) }); } catch { return { ok: false }; }
    const movedAt = new Date().toISOString();
    const result = c.isCheckmate() ? color : c.isDraw() || c.isStalemate() ? "d" : null;
    const { data: upd } = await a.from("games").update({
      pgn: c.pgn(), fen: c.fen(), last_move_at: movedAt, reminded: false, draw_offer: null,
      expires_at: later(MOVE_LIMIT_MS), updated_at: new Date().toISOString(),
      ...(result ? { status: "finished", result, end_reason: result === "d" ? "draw" : "checkmate" } : {}),
    }).eq("id", g.id).eq("status", "active").eq("pgn", g.pgn).select("id");
    if (!upd?.length) return { ok: false };
    if (!result) {
      const opp = color === "w" ? g.black : g.white;
      if (opp) await notify(a, opp, "pushTurn", { name: await playerName(a, me) }, { game: g.id });
    }
    return { ok: true };
  });

export const gameAction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ gameId: z.string().uuid(), action: z.enum(["resign", "offerDraw", "acceptDraw", "declineDraw"]) }).parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    const { g, color } = await loadActive(a, data.gameId, me);
    if (data.action === "resign") await finishGame(a, g, color === "w" ? "b" : "w", "resign");
    else if (data.action === "offerDraw") await a.from("games").update({ draw_offer: color }).eq("id", g.id).eq("status", "active").eq("pgn", g.pgn);
    else if (data.action === "acceptDraw" && g.draw_offer && g.draw_offer !== color) await finishGame(a, g, "d", "agreed");
    else if (data.action === "declineDraw") await a.from("games").update({ draw_offer: null }).eq("id", g.id).eq("status", "active").eq("pgn", g.pgn);
    return { ok: true };
  });

export const sendChat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ gameId: z.string().uuid(), phrase: z.number().int().min(0).max(11) }).parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    const { g } = await loadActive(a, data.gameId, me);
    const { count } = await a.from("game_chat").select("id", { count: "exact", head: true }).eq("game_id", g.id).eq("player", me).gt("created_at", new Date(Date.now() - 10_000).toISOString());
    if ((count ?? 0) >= 3) return { ok: false };
    await a.from("game_chat").insert({ game_id: g.id, player: me, phrase: data.phrase });
    return { ok: true };
  });

export const myOnlineStats = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    return statsFor(me, await allMatches(a, me) as MatchRow[]);
  });

export const getLeaderboard = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ kind: z.enum(["year", "week", "month"]), country: z.string().length(2).nullable() }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await import("./server/core");
    const a = await db();
    const { data: rows, error } = await a.rpc("leaderboard", { p_kind: data.kind, p_country: data.country as string });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
