import { createServerFn } from "@tanstack/react-start";
import { Chess } from "chess.js";
import { z } from "zod";
import { canCloseOnlineGame, INVITE_TTL_MS, LOBBY_TTL_MS, MOVE_LIMIT_MS, statsFor, type MatchRow } from "./online-rules";
import { automaticDrawReason } from "./chess-rules";
import { Cred, PLAYER_COLS, allMatches, auth, finishGame, finishTimedOutGame, nameOf, notify, sweepGames, type DB } from "./server/core";

const GAME_COLS = "id, kind, status, host, invitee, white, black, code, pgn, fen, result, end_reason, draw_offer, draw_offers_w, draw_offers_b, last_move_at, reminded, expires_at, created_at";
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
  }).eq("id", gameId).eq("status", "waiting").gt("expires_at", new Date().toISOString()).select("id").maybeSingle();
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

/** Removes an unfinished game and its chat; completed match history is preserved. */
export const cancelGame = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ gameId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    const { data: g } = await a.from("games").select("id, status, host, invitee, white, black").eq("id", data.gameId).maybeSingle();
    if (!g) return { ok: true };
    if (!canCloseOnlineGame(g, me)) return { ok: false };
    const { error } = await a.from("games").delete().eq("id", g.id).in("status", ["waiting", "active"]);
    if (error) throw new Error("game_close_failed");
    const { data: remaining } = await a.from("games").select("id").eq("id", g.id).in("status", ["waiting", "active"]).maybeSingle();
    return { ok: !remaining };
  });

/** The database serializes pairing so simultaneous searches cannot create crossed games. */
export const quickMatch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ gameId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    const args = data.gameId ? { p_player: me, p_game: data.gameId } : { p_player: me };
    const { data: rows, error } = await a.rpc("quick_match", args);
    if (error) throw new Error("quick_match_failed");
    const row = rows?.[0];
    if (!row) throw new Error("quick_match_failed");
    return { id: row.id, status: row.status };
  });

/** A quick-search exit deletes only a still-waiting row, never a newly active match. */
export const abandonQuickMatch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ gameId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    const { data: g } = await a.from("games").select("id, status, host, kind").eq("id", data.gameId).maybeSingle();
    if (!g || g.kind !== "quick" || g.host !== me) return { status: "expired" as const };
    if (g.status !== "waiting") return { status: g.status };
    const { data: removed, error } = await a.from("games").delete()
      .eq("id", g.id).eq("kind", "quick").eq("host", me).eq("status", "waiting").select("id");
    if (error) throw new Error("quick_match_close_failed");
    if (removed?.length) return { status: "expired" as const };
    const { data: fresh } = await a.from("games").select("status").eq("id", g.id).maybeSingle();
    return { status: fresh?.status ?? "expired" };
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
  if (new Date(g.expires_at).getTime() <= Date.now()) {
    await finishTimedOutGame(a, g);
    throw new Error("not_active");
  }
  return { g, color: (g.white === me ? "w" : "b") as "w" | "b" };
}

/** The server decides every move (cheat-proof). */
export const makeMove = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ gameId: z.string().uuid(), from: z.string().length(2), to: z.string().length(2), promotion: z.enum(["q", "r", "b", "n"]).optional() }).parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    const { g, color } = await loadActive(a, data.gameId, me);
    const c = g.pgn ? new Chess() : new Chess(g.fen);
    if (g.pgn) c.loadPgn(g.pgn);
    if (c.turn() !== color) return { ok: false };
    try { c.move({ from: data.from, to: data.to, ...(data.promotion ? { promotion: data.promotion } : {}) }); } catch { return { ok: false }; }
    const movedAt = new Date().toISOString();
    const result = c.isCheckmate() ? color : automaticDrawReason(c) ? "d" : null;
    const { data: upd } = await a.from("games").update({
      pgn: c.pgn(), fen: c.fen(), last_move_at: movedAt, reminded: false, draw_offer: null,
      expires_at: later(MOVE_LIMIT_MS), updated_at: new Date().toISOString(),
      ...(result ? { status: "finished", result, end_reason: result === "d" ? "draw" : "checkmate" } : {}),
    }).eq("id", g.id).eq("status", "active").eq("pgn", g.pgn).gt("expires_at", movedAt).select("id");
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
    if (data.action === "resign") {
      return { ok: await finishGame(a, g, color === "w" ? "b" : "w", "resign", { enforceDeadline: true }) };
    }
    if (data.action === "offerDraw") {
      const field = color === "w" ? "draw_offers_w" as const : "draw_offers_b" as const;
      const previous = g[field];
      if (previous >= 2 || g.draw_offer) return { ok: false, reason: previous >= 2 ? "limit" as const : "pending" as const };
      const changes = { draw_offer: color, draw_offers_w: g.draw_offers_w, draw_offers_b: g.draw_offers_b, updated_at: new Date().toISOString() };
      changes[field] = previous + 1;
      const { data: offered, error } = await a.from("games").update(changes)
        .eq("id", g.id).eq("status", "active").eq("pgn", g.pgn).eq(field, previous).is("draw_offer", null)
        .gt("expires_at", new Date().toISOString()).select("id");
      if (error) throw new Error("draw_offer_failed");
      return { ok: !!offered?.length, reason: offered?.length ? undefined : "stale" as const };
    }
    const pendingOffer = g.draw_offer === "w" || g.draw_offer === "b" ? g.draw_offer : null;
    if (data.action === "acceptDraw") {
      if (!pendingOffer || pendingOffer === color) return { ok: false, reason: "stale" as const };
      return { ok: await finishGame(a, g, "d", "agreed", { expectedDrawOffer: pendingOffer, enforceDeadline: true }) };
    }
    if (!pendingOffer || pendingOffer === color) return { ok: false, reason: "stale" as const };
    const { data: declined, error } = await a.from("games").update({ draw_offer: null, updated_at: new Date().toISOString() })
      .eq("id", g.id).eq("status", "active").eq("pgn", g.pgn).eq("draw_offer", pendingOffer)
      .gt("expires_at", new Date().toISOString()).select("id");
    if (error) throw new Error("draw_decline_failed");
    return { ok: !!declined?.length };
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
