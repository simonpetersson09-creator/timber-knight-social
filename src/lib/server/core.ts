// Server-only helpers shared by server functions and server routes. Never import from components.
import { Chess } from "chess.js";
import { z } from "zod";
import { translate, type Key } from "@/lib/i18n/translate";
import { moveDeadline } from "@/lib/online-rules";
import { allowsNotification } from "@/lib/notification-preferences";

export const Cred = z.object({ id: z.string().uuid(), secret: z.string().min(20).max(100) });
export type CredT = z.infer<typeof Cred>;

export async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function db() { return (await import("@/integrations/supabase/client.server")).supabaseAdmin; }
export type DB = Awaited<ReturnType<typeof db>>;
export const PLAYER_COLS = "id, player_number, name, avatar, country, friend_code, last_seen";

/** Verifies the anonymous device credentials and marks the player as seen. */
export async function auth(c: CredT) {
  const a = await db();
  const { data } = await a.from("players").select("id, secret_hash").eq("id", c.id).maybeSingle();
  if (!data || data.secret_hash !== (await sha256(c.secret))) throw new Error("unauthorized");
  await a.from("players").update({ last_seen: new Date().toISOString() }).eq("id", c.id);
  return { a, me: c.id };
}

export const nameOf = (p: { name: string | null; player_number: number } | null | undefined) => (p ? p.name ?? `#${p.player_number}` : "?");

/** Sends a push notification in the recipient's language. Silently skipped until push is connected. */
export async function notify(a: DB, playerId: string, key: Key, params: Record<string, string>, data: Record<string, string>) {
  const { data: p } = await a.from("players").select("push_token, notify, lang, notify_turn, notify_reminders, notify_play").eq("id", playerId).maybeSingle();
  if (!p?.push_token || !allowsNotification(key, p)) return;
  const lovable = process.env["LOVABLE_API_KEY"], fcm = process.env["FIREBASE_MESSAGING_API_KEY"];
  if (!lovable || !fcm) return;
  const res = await fetch("https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": fcm, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { token: p.push_token, notification: { title: "Mr B Chess", body: translate(p.lang, key, params) }, data } }),
  });
  if (res.status === 404 || res.status === 400) await a.from("players").update({ push_token: null }).eq("id", playerId);
  else if (!res.ok) console.error(`FCM send failed [${res.status}]: ${await res.text()}`);
}

type GameRow = { id: string; status: string; white: string | null; black: string | null; fen: string; last_move_at: string; reminded: boolean; expires_at: string; kind: string; host: string };

/** Ends a game, records it for statistics (resigned games don't count). */
export async function finishGame(a: DB, g: { id: string; white: string | null; black: string | null }, result: "w" | "b" | "d", reason: string) {
  const { data: upd } = await a.from("games").update({ status: "finished", result, end_reason: reason, draw_offer: null, updated_at: new Date().toISOString() })
    .eq("id", g.id).eq("status", "active").select("id");
  if (!upd?.length || !g.white || !g.black) return;
  await a.from("matches").insert({ white: g.white, black: g.black, result, counts: reason !== "resign" });
  const now = new Date().toISOString();
  await a.from("players").update({ last_played: now }).in("id", [g.white, g.black]);
}

/** Expires stale invites/lobbies, reminds idle players and forfeits after the move limit. */
export async function sweepGames(a: DB, rows: GameRow[]) {
  const now = Date.now();
  for (const g of rows) {
    if (g.status === "waiting" && new Date(g.expires_at).getTime() < now) {
      await a.from("games").update({ status: "expired" }).eq("id", g.id).eq("status", "waiting");
      g.status = "expired";
    } else if (g.status === "active") {
      const turn = new Chess(g.fen).turn();
      const toMove = turn === "w" ? g.white : g.black;
      const d = moveDeadline(new Date(g.last_move_at).getTime(), now);
      if (d === "timeout") { await finishGame(a, g, turn === "w" ? "b" : "w", "timeout"); g.status = "finished"; }
      else if (d === "remind" && !g.reminded && toMove) {
        await a.from("games").update({ reminded: true }).eq("id", g.id);
        g.reminded = true;
        await notify(a, toMove, "pushRemindMove", {}, { game: g.id });
      }
    }
  }
}
