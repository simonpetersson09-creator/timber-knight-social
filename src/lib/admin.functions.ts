import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { stockholmDay } from "./server/core";
import { buildAdminStats, type AdminAppDay, type AdminEvent, type AdminMatch, type AdminPlayer } from "./admin-stats";

async function check(pw: string) {
  const want = process.env["ADMIN_PASSWORD"];
  if (!want || pw !== want) throw new Error("wrong_password");
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

/** Full native-app statistics for the latest 30 Stockholm days; web and test devices are excluded. */
export const adminStats = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ password: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const a = await check(data.password);
    const since = stockholmDay(new Date(Date.now() - 29 * 86_400_000));
    const eventSince = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data: tests, error: testError } = await a.from("players").select("id, player_number").eq("is_test", true);
    if (testError) throw new Error("stats_read_failed");
    const testIds = new Set((tests ?? []).map((t) => t.id));
    const players: AdminPlayer[] = [];
    for (let from = 0; ; from += 1000) {
      const { data: rows, error } = await a.from("players").select("id, created_at, platform").in("platform", ["ios", "android"]).order("id").range(from, from + 999);
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
    const eligibleEvents = events.filter((e) => !e.player || !testIds.has(e.player));
    const stats = buildAdminStats({ players, appDays, events, matches, testIds });
    const group = (kind: string) => Object.entries(eligibleEvents.filter((e) => e.kind === kind).reduce<Record<string, number>>((m, e) => ({ ...m, [e.name]: (m[e.name] ?? 0) + 1 }), {})).sort((x, y) => y[1] - x[1]);
    return {
      ...stats,
      ads: group("ad"), errors: group("error"), play: group("play"),
      recentErrors: eligibleEvents.filter((e) => e.kind === "error").slice(0, 20),
      diagnostics: eligibleEvents.filter((e) => e.kind === "ad" && e.name.startsWith("app_open")).slice(0, 100),
      testPlayers: (tests ?? []).map((t) => t.player_number),
    };
  });

export const adminSetTest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ password: z.string().max(200), playerNumber: z.number().int(), isTest: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const a = await check(data.password);
    const { data: upd } = await a.from("players").update({ is_test: data.isTest }).eq("player_number", data.playerNumber).select("id");
    return { ok: !!upd?.length };
  });
