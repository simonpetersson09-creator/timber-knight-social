import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function check(pw: string) {
  const want = process.env["ADMIN_PASSWORD"];
  if (!want || pw !== want) throw new Error("wrong_password");
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

/** Phones per day (iOS/Android only, test phones excluded), last 30 days, plus error and ad reports. */
export const adminStats = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ password: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const a = await check(data.password);
    const since = new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10);
    const { data: tests } = await a.from("players").select("id, player_number").eq("is_test", true);
    const testIds = new Set((tests ?? []).map((t) => t.id));
    const days: Record<string, { ios: number; android: number }> = {};
    for (let i = 0; i < 30; i++) days[new Date(Date.now() - i * 864e5).toISOString().slice(0, 10)] = { ios: 0, android: 0 };
    for (let from = 0; ; from += 1000) {
      const { data: rows } = await a.from("app_days").select("player, day, platform").gte("day", since).in("platform", ["ios", "android"]).range(from, from + 999);
      for (const r of rows ?? []) if (!testIds.has(r.player) && days[r.day]) days[r.day]![r.platform as "ios" | "android"]++;
      if (!rows || rows.length < 1000) break;
    }
    const { data: events } = await a.from("client_events").select("kind, name, platform, detail, created_at").gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString()).order("created_at", { ascending: false }).limit(500);
    const ev = (events ?? []).filter((e) => e.platform !== "web");
    const group = (kind: string) => Object.entries(ev.filter((e) => e.kind === kind).reduce<Record<string, number>>((m, e) => ({ ...m, [e.name]: (m[e.name] ?? 0) + 1 }), {})).sort((x, y) => y[1] - x[1]);
    return {
      days: Object.entries(days).sort((x, y) => y[0].localeCompare(x[0])).map(([day, v]) => ({ day, ...v, total: v.ios + v.android })),
      ads: group("ad"), errors: group("error"),
      recentErrors: ev.filter((e) => e.kind === "error").slice(0, 20),
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
