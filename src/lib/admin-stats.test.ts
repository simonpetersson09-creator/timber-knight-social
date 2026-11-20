import { describe, expect, it } from "vitest";
import { buildAdminStats } from "./admin-stats";

const NOW = new Date("2026-11-19T12:00:00Z");
const players = [
  { id: "ios", created_at: "2026-11-18T12:00:00Z", platform: "ios" },
  { id: "android", created_at: "2026-11-19T08:00:00Z", platform: "android" },
  { id: "web", created_at: "2026-11-19T08:00:00Z", platform: "web" },
  { id: "test", created_at: "2026-11-19T08:00:00Z", platform: "ios" },
];

describe("admin statistics", () => {
  it("always returns the latest 30 Stockholm days and excludes web and test devices", () => {
    const result = buildAdminStats({ players, testIds: new Set(["test"]), now: NOW, appDays: [
      { player: "ios", day: "2026-11-19", platform: "ios" },
      { player: "android", day: "2026-11-19", platform: "android" },
      { player: "web", day: "2026-11-19", platform: "web" },
      { player: "test", day: "2026-11-19", platform: "ios" },
    ], events: [], matches: [] });
    expect(result.days).toHaveLength(30);
    expect(result.days[0]!).toMatchObject({ day: "2026-11-19", devices: 2, ios: 1, android: 1, new_players: 1 });
    expect(result.days[29]!.day).toBe("2026-10-21");
  });

  it("counts playing devices, computer games, online results, resignations and errors", () => {
    const result = buildAdminStats({ players, testIds: new Set(["test"]), now: NOW, appDays: [], events: [
      { player: "ios", kind: "play", name: "local_game_started", platform: "ios", detail: null, created_at: "2026-11-19T10:00:00Z" },
      { player: "ios", kind: "play", name: "local_game_finished", platform: "ios", detail: null, created_at: "2026-11-19T10:10:00Z" },
      { player: "ios", kind: "error", name: "render_failed", platform: "ios", detail: null, created_at: "2026-11-19T10:11:00Z" },
      { player: "test", kind: "play", name: "local_game_finished", platform: "ios", detail: null, created_at: "2026-11-19T10:12:00Z" },
    ], matches: [
      { white: "ios", black: "android", game_id: "game-1", counts: true, finished_at: "2026-11-19T11:00:00Z" },
      { white: "ios", black: "android", game_id: "game-2", counts: false, finished_at: "2026-11-19T11:05:00Z" },
    ] });
    expect(result.days[0]!).toMatchObject({ played: 1, cpu_finished: 1, online_finished: 1, forfeits: 1, issues: 1, issue_devices: 1, total: 2 });
  });

  it("counts online play events without treating app opens or settings as games", () => {
    const events = [
      { player: "ios", kind: "play", name: "app_opened", platform: "ios", detail: null, created_at: "2026-11-19T09:00:00Z" },
      { player: "ios", kind: "play", name: "settings_opened", platform: "ios", detail: null, created_at: "2026-11-19T09:01:00Z" },
      { player: "ios", kind: "play", name: "online_game_started", platform: "ios", detail: null, created_at: "2026-11-19T09:02:00Z" },
      { player: "android", kind: "play", name: "online_game_finished", platform: "android", detail: null, created_at: "2026-11-19T09:03:00Z" },
    ];
    const result = buildAdminStats({ players, testIds: new Set(["test"]), now: NOW, appDays: [], events, matches: [] });
    expect(result.days[0]!.played).toBe(2);
  });

  it("excludes web and test matches even when the other participant is native", () => {
    const result = buildAdminStats({ players, testIds: new Set(["test"]), now: NOW, appDays: [], events: [], matches: [
      { white: "ios", black: "web", game_id: "web-match", counts: true, finished_at: "2026-11-19T11:00:00Z" },
      { white: "ios", black: "test", game_id: "test-match", counts: true, finished_at: "2026-11-19T11:05:00Z" },
      { white: "ios", black: "android", game_id: "native-match", counts: true, finished_at: "2026-11-19T11:10:00Z" },
    ] });
    expect(result.days[0]!).toMatchObject({ online_finished: 1, forfeits: 0 });
  });

  it("keeps a native opponent's match history after the other player is anonymized", () => {
    const anonymized = { id: "deleted", created_at: "2026-11-01T08:00:00Z", platform: "android", deleted_at: "2026-11-19T12:00:00Z" };
    const result = buildAdminStats({ players: [...players, anonymized], testIds: new Set(["test"]), now: NOW, appDays: [
      { player: "deleted", day: "2026-11-19", platform: "android" },
    ], events: [], matches: [
      { white: "ios", black: "deleted", game_id: "preserved", counts: true, finished_at: "2026-11-19T11:00:00Z" },
    ] });
    expect(result.days[0]!).toMatchObject({ devices: 0, online_finished: 1 });
  });

  it("supports a seven-day analysis without changing the native filters", () => {
    const result = buildAdminStats({ players, testIds: new Set(["test"]), now: NOW, appDays: [
      { player: "ios", day: "2026-11-13", platform: "ios" },
      { player: "ios", day: "2026-11-12", platform: "ios" },
      { player: "web", day: "2026-11-13", platform: "web" },
    ], events: [], matches: [], periodDays: 7 });
    expect(result.days).toHaveLength(7);
    expect(result.days[6]!).toMatchObject({ day: "2026-11-13", devices: 1, ios: 1 });
  });
});
