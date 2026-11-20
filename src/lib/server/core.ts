// Server-only helpers shared by server functions and server routes. Never import from components.
import { Chess } from "chess.js";
import { z } from "zod";
import { translate, type Key } from "@/lib/i18n/translate";
import { moveDeadline } from "@/lib/online-rules";
import { timeoutWinner } from "@/lib/chess-rules";
import { allowsNotification } from "@/lib/notification-preferences";
import { getRequestHeader } from "@tanstack/react-start/server";
import { ABUSE_QUOTAS, type AbuseAction } from "./abuse-policy";
import { pushRetrySeconds, shouldInvalidatePushToken, shouldRetryPush } from "@/lib/push-delivery";

export const Cred = z.object({ id: z.string().uuid(), secret: z.string().min(20).max(100) });
export type CredT = z.infer<typeof Cred>;

export async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function db() { return (await import("@/integrations/supabase/client.server")).supabaseAdmin; }
export type DB = Awaited<ReturnType<typeof db>>;
export const PLAYER_COLS = "id, player_number, name, avatar, country, friend_code, last_seen";

/** A non-reversible request subject; raw IP addresses are never persisted. */
export function requestSubject(identity = ""): string {
  const forwarded = getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-real-ip") ?? forwarded ?? "unknown";
  return `${identity}:${ip}`.slice(0, 240);
}

/** Atomic persistent quota. Admin prechecks use consume=false; failures consume. */
export async function enforceAbuseLimit(action: AbuseAction, subject: string, consume = true): Promise<void> {
  const quota = ABUSE_QUOTAS[action];
  const a = await db();
  const { data: allowed, error } = await a.rpc("chess_abuse_limit", {
    p_action: action,
    p_subject: await sha256(`${action}:${subject}`),
    p_limit: quota.limit,
    p_window_seconds: quota.windowSeconds,
    p_block_seconds: quota.blockSeconds,
    p_consume: consume,
  });
  if (error) throw new Error("abuse_limit_unavailable");
  if (!allowed) throw new Error("rate_limited");
}

/** Verifies the anonymous device credentials and marks the player as seen. */
export async function auth(c: CredT) {
  await enforceAbuseLimit("api", requestSubject(c.id));
  const a = await db();
  const { data } = await a.from("players").select("id, secret_hash, platform, deleted_at").eq("id", c.id).maybeSingle();
  if (!data || data.deleted_at || data.secret_hash !== (await sha256(c.secret))) throw new Error("unauthorized");
  await a.from("players").update({ last_seen: new Date().toISOString() }).eq("id", c.id);
  if (data.platform === "ios" || data.platform === "android") await a.from("app_days").upsert({ player: c.id, day: stockholmDay(), platform: data.platform }, { onConflict: "player,day" });
  return { a, me: c.id };
}

export const nameOf = (p: { name: string | null; player_number: number } | null | undefined) => (p ? p.name ?? `#${p.player_number}` : "?");

function pushStrings(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, String(entry)]));
}

/** Claims durable outbox rows once, delivers them and settles each exact attempt. */
export async function deliverPushBatch(a: DB, deadline?: number): Promise<void> {
  const lovable = process.env["LOVABLE_API_KEY"], fcm = process.env["FIREBASE_MESSAGING_API_KEY"];
  if (!lovable || !fcm || (deadline && Date.now() >= deadline)) return;
  const { data: jobs, error: claimError } = await a.rpc("claim_push_deliveries", { p_limit: 25 });
  if (claimError) { console.error(`Push claim failed: ${claimError.message}`); return; }
  for (const job of jobs ?? []) {
    if (deadline && Date.now() >= deadline) break;
    const settle = async (success: boolean, retrySeconds = 60) => {
      const { error } = await a.rpc("finish_push_delivery", { p_id: job.id, p_attempts: job.attempts, p_success: success, p_retry_seconds: retrySeconds });
      if (error) console.error(`Push settlement failed: ${error.message}`);
    };
    const { data: p } = await a.from("players").select("push_token, notify, lang, notify_turn, notify_reminders, notify_play").eq("id", job.player).maybeSingle();
    const key = job.message_key as Key;
    if (!p?.push_token || !allowsNotification(key, p)) { await settle(true); continue; }
    const attemptedToken = p.push_token;
    const res = await fetch("https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": fcm, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { token: attemptedToken, notification: { title: "Mr B Chess", body: translate(p.lang, key, pushStrings(job.params)) }, data: pushStrings(job.data) } }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (res?.ok) { await settle(true); continue; }
    const status = res?.status ?? null;
    if (status !== null && shouldInvalidatePushToken(status)) {
      // A late failure for an old token must never clear a newly registered token.
      const { error } = await a.from("players").update({ push_token: null }).eq("id", job.player).eq("push_token", attemptedToken);
      if (error) console.error(`Push token cleanup failed: ${error.message}`);
      await settle(true);
      continue;
    }
    if (shouldRetryPush(status)) {
      if (res) console.error(`FCM send failed [${res.status}]: ${await res.text()}`);
      await settle(false, pushRetrySeconds(job.attempts));
      continue;
    }
    if (res) console.error(`FCM terminal failure [${res.status}]: ${await res.text()}`);
    await settle(true); // Terminal client failures are discarded, never retried.
  }
}

/** Game/reminder triggers enqueue atomically; this drains after the surrounding commit. */
export async function notify(a: DB, _playerId: string, _key: Key, _params: Record<string, string>, _data: Record<string, string>, deadline?: number) {
  await deliverPushBatch(a, deadline);
}

/** Admin-only delivery check. Returns an explicit result instead of silently skipping. */
export async function notifyTest(a: DB, playerId: string): Promise<"sent" | "missing_token" | "not_configured" | "failed"> {
  const { data: p } = await a.from("players").select("push_token").eq("id", playerId).maybeSingle();
  if (!p?.push_token) return "missing_token";
  const lovable = process.env["LOVABLE_API_KEY"], fcm = process.env["FIREBASE_MESSAGING_API_KEY"];
  if (!lovable || !fcm) return "not_configured";
  const res = await fetch("https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": fcm, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { token: p.push_token, notification: { title: "Mr B Chess", body: "Testnotis från Mr B Chess" }, data: { test: "admin" } } }),
  }).catch(() => null);
  if (!res) return "failed";
  if (shouldInvalidatePushToken(res.status)) {
    const { error } = await a.from("players").update({ push_token: null }).eq("id", playerId).eq("push_token", p.push_token);
    if (error) console.error(`Push token cleanup failed: ${error.message}`);
  }
  return res.ok ? "sent" : "failed";
}

type GameRow = { id: string; status: string; white: string | null; black: string | null; fen: string; last_move_at: string; reminded: boolean; expires_at: string; kind: string; host: string };

/** Ends exactly the observed active position; optional guards reject stale draw/time actions. */
export async function finishGame(
  a: DB,
  g: { id: string; white: string | null; black: string | null; fen: string; last_move_at: string },
  result: "w" | "b" | "d",
  reason: string,
  options: { expectedDrawOffer?: "w" | "b"; enforceDeadline?: boolean } = {},
): Promise<boolean> {
  let query = a.from("games").update({ status: "finished", result, end_reason: reason, draw_offer: null, updated_at: new Date().toISOString() })
    .eq("id", g.id).eq("status", "active").eq("fen", g.fen).eq("last_move_at", g.last_move_at);
  if (options.expectedDrawOffer) query = query.eq("draw_offer", options.expectedDrawOffer);
  if (options.enforceDeadline ?? true) query = query.gt("expires_at", new Date().toISOString());
  const { data, error } = await query.select("id");
  if (error) throw new Error("game_finish_failed");
  return !!data?.length;
}

/** Settles a flag fall using the actual position, including insufficient mating material. */
export async function finishTimedOutGame(a: DB, g: GameRow): Promise<boolean> {
  const game = new Chess(g.fen);
  return finishGame(a, g, timeoutWinner(game, game.turn()) ?? "d", "timeout", { enforceDeadline: false });
}

export function stockholmDay(now = new Date()) { return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(now); }

export async function allMatches(a: DB, me: string) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await a.from("matches").select("white, black, result, counts, finished_at").or(`white.eq.${me},black.eq.${me}`).eq("counts", true).order("finished_at", { ascending: false }).order("id").range(from, from + 999);
    if (error) throw new Error("stats_read_failed");
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

/** Expires stale games and returns only confirmed changes; a deadline can safely defer the rest. */
export async function sweepGames(a: DB, rows: GameRow[], deadline?: number): Promise<number> {
  const now = Date.now();
  let changed = 0;
  for (const g of rows) {
    if (deadline && Date.now() >= deadline) break;
    if (g.status === "waiting" && new Date(g.expires_at).getTime() < now) {
      const { data, error } = await a.from("games").update({ status: "expired" }).eq("id", g.id).eq("status", "waiting").select("id");
      if (error) throw new Error("game_expiry_failed");
      if (data?.length) { changed++; g.status = "expired"; }
    } else if (g.status === "active") {
      const turn = new Chess(g.fen).turn();
      const toMove = turn === "w" ? g.white : g.black;
      const expired = new Date(g.expires_at).getTime() <= now;
      const d = moveDeadline(new Date(g.last_move_at).getTime(), now);
      if (expired || d === "timeout") {
        if (await finishTimedOutGame(a, g)) { changed++; g.status = "finished"; }
      } else if (d === "remind" && !g.reminded && toMove) {
        const { data, error } = await a.from("games").update({ reminded: true }).eq("id", g.id).eq("status", "active").eq("reminded", false).select("id");
        if (error) throw new Error("game_reminder_failed");
        if (data?.length) {
          changed++;
          g.reminded = true;
          await notify(a, toMove, "pushRemindMove", {}, { game: g.id }, deadline);
        }
      }
    }
  }
  return changed;
}
