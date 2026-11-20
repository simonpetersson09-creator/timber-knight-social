import { createServerFn } from "@tanstack/react-start";
import { clearSession, updateSession, useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import { buildAdminStats, type AdminAppDay, type AdminEvent, type AdminMatch, type AdminPlayer } from "./admin-stats";
import { buildRetention } from "./admin-retention";
import { ADMIN_SESSION_SECONDS, isAdminSession, type AdminSession } from "./admin-session";
import { db, enforceAbuseLimit, requestSubject } from "./server/core";

function sessionConfig() {
  const password = process.env["ADMIN_SESSION_SECRET"];
  if (!password) throw new Error("admin_unavailable");
  return {
    password,
    name: "mrbchess_admin",
    maxAge: ADMIN_SESSION_SECONDS,
    cookie: {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

async function checkPassword(pw: string) {
  const subject = requestSubject("admin");
  await enforceAbuseLimit("admin_requests", subject);
  await enforceAbuseLimit("admin_failures", subject, false);
  const want = process.env["ADMIN_PASSWORD"];
  if (!want || pw !== want) {
    await enforceAbuseLimit("admin_failures", subject);
    throw new Error("wrong_password");
  }
}

async function adminClient() {
  const subject = requestSubject("admin");
  await enforceAbuseLimit("admin_requests", subject);
  await enforceAbuseLimit("admin_failures", subject, false);
  const session = await useSession<AdminSession>(sessionConfig());
  if (!isAdminSession(session.data)) throw new Error("wrong_password");
  return db();
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ password: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    await checkPassword(data.password);
    await updateSession<AdminSession>(sessionConfig(), { admin: true });
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" })
  .handler(async () => {
    await clearSession(sessionConfig());
    return { ok: true as const };
  });

const Period = z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30);

/** Native statistics: a fixed 30-day table plus a selectable 7/30/90-day analysis. */
export const adminStats = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ days: Period }).parse(d))
  .handler(async ({ data }) => {
    const a = await adminClient();
    const historyDays = data.days + 30;
    // Retention needs the full activity history; event and match reads stay period-bounded below.
    const since = "1970-01-01";
    const eventSince = new Date(Date.now() - historyDays * 86_400_000).toISOString();
    const { data: tests, error: testError } = await a.from("players").select("id, player_number, deleted_at").eq("is_test", true);
    if (testError) throw new Error("stats_read_failed");
    const testIds = new Set((tests ?? []).map((t) => t.id));
    const players: AdminPlayer[] = [];
    for (let from = 0; ; from += 1000) {
      const { data: rows, error } = await a.from("players").select("id, created_at, platform, deleted_at").in("platform", ["ios", "android"]).order("id").range(from, from + 999);
      if (error) throw new Error("stats_read_failed");
      players.push(...(rows ?? []));
      if (!rows || rows.length < 1000) break;
    }
    const appDays: AdminAppDay[] = [];
    for (let from = 0; ; from += 1000) {
      const { data: rows, error } = await a.from("app_days").select("player, day, platform").gte("day", since).in("platform", ["ios", "android"]).order("day").order("player").range(from, from + 999);
      if (error) throw new Error("stats_read_failed");
      appDays.push(...(rows ?? []));
      if (!rows || rows.length < 1000) break;
    }
    const events: AdminEvent[] = [];
    for (let from = 0; ; from += 1000) {
      const { data: rows, error } = await a.from("client_events").select("player, kind, name, platform, detail, created_at").in("platform", ["ios", "android"]).gte("created_at", eventSince).order("created_at", { ascending: false }).order("id").range(from, from + 999);
      if (error) throw new Error("event_stats_failed");
      events.push(...(rows ?? []));
      if (!rows || rows.length < 1000) break;
    }
    const matches: AdminMatch[] = [];
    for (let from = 0; ; from += 1000) {
      const { data: rows, error } = await a.from("matches").select("white, black, finished_at, game_id, counts").gte("finished_at", eventSince).not("game_id", "is", null).order("finished_at", { ascending: false }).order("id").range(from, from + 999);
      if (error) throw new Error("stats_read_failed");
      matches.push(...(rows ?? []));
      if (!rows || rows.length < 1000) break;
    }
    const { data: gameRows, error: gameError } = await a.from("games").select("id, status, kind, host, white, black, invitee").in("status", ["active", "waiting"]).limit(5000);
    if (gameError) throw new Error("stats_read_failed");
    const eligibleIds = new Set(players.filter((player) => !testIds.has(player.id) && !player.deleted_at).map((player) => player.id));
    const liveRows = (gameRows ?? []).filter((game) => eligibleIds.has(game.host) && [game.white, game.black, game.invitee].every((id) => !id || eligibleIds.has(id)));
    const liveGames = {
      active: liveRows.filter((game) => game.status === "active").length,
      waiting: liveRows.filter((game) => game.status === "waiting").length,
      byKind: Object.entries(liveRows.reduce<Record<string, number>>((all, game) => ({ ...all, [`${game.status}:${game.kind}`]: (all[`${game.status}:${game.kind}`] ?? 0) + 1 }), {})),
    };
    const eligibleEvents = events.filter((e) => !e.player || eligibleIds.has(e.player));
    const stats = buildAdminStats({ players, appDays, events, matches, testIds });
    const periodStats = buildAdminStats({ players, appDays, events, matches, testIds, periodDays: data.days });
    const periodStart = Date.now() - data.days * 86_400_000;
    const periodEvents = eligibleEvents.filter((event) => Date.parse(event.created_at) >= periodStart);
    const group = (kind: string) => Object.entries(periodEvents.filter((e) => e.kind === kind).reduce<Record<string, number>>((m, e) => ({ ...m, [e.name]: (m[e.name] ?? 0) + 1 }), {})).sort((x, y) => y[1] - x[1]);
    return {
      ...stats,
      period: data.days,
      periodStats,
      retention: buildRetention(players, appDays, testIds),
      liveGames,
      ads: group("ad"), errors: group("error"), play: group("play"),
      recentErrors: periodEvents.filter((e) => e.kind === "error").slice(0, 20),
      diagnostics: periodEvents.filter((e) => e.kind === "ad" && e.name.startsWith("app_open")).slice(0, 100),
      testPlayers: (tests ?? []).filter((t) => !t.deleted_at).map((t) => t.player_number),
    };
  });

export const adminSetTest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ playerNumber: z.number().int(), isTest: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const a = await adminClient();
    const { data: upd, error } = await a.from("players").update({ is_test: data.isTest }).eq("player_number", data.playerNumber).is("deleted_at", null).select("id");
    if (error) throw new Error("test_player_update_failed");
    return { ok: !!upd?.length };
  });

export const adminPushTest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ playerNumber: z.number().int() }).parse(d))
  .handler(async ({ data }) => {
    const a = await adminClient();
    const { data: player, error } = await a.from("players").select("id").eq("player_number", data.playerNumber).is("deleted_at", null).maybeSingle();
    if (error) throw new Error("test_player_read_failed");
    if (!player) return { result: "not_found" as const };
    const { notifyTest } = await import("./server/core");
    return { result: await notifyTest(a, player.id) };
  });
