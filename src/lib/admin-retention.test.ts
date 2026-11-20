import { describe, expect, it } from "vitest";
import { buildRetention } from "./admin-retention";

const now = new Date("2026-11-19T12:00:00Z");
const players = [
  { id: "returning", created_at: "2026-10-19T08:00:00Z", platform: "ios" },
  { id: "missing", created_at: "2026-10-19T08:00:00Z", platform: "android" },
  { id: "new", created_at: "2026-11-19T08:00:00Z", platform: "ios" },
  { id: "web", created_at: "2026-10-19T08:00:00Z", platform: "web" },
  { id: "test", created_at: "2026-10-19T08:00:00Z", platform: "ios" },
];

describe("native cohort retention", () => {
  it("measures D1 D7 and D30 only for mature native cohorts and excludes web and tests", () => {
    const result = buildRetention(players, [
      { player: "returning", day: "2026-10-20", platform: "ios" },
      { player: "returning", day: "2026-10-26", platform: "ios" },
      { player: "returning", day: "2026-11-18", platform: "ios" },
      { player: "missing", day: "2026-10-20", platform: "android" },
      { player: "web", day: "2026-11-18", platform: "web" },
      { player: "test", day: "2026-11-18", platform: "ios" },
    ], new Set(["test"]), now);
    expect(result.d1).toEqual({ returned: 2, eligible: 2, rate: 100 });
    expect(result.d7).toEqual({ returned: 1, eligible: 2, rate: 50 });
    expect(result.d30).toEqual({ returned: 1, eligible: 2, rate: 50 });
  });

  it("excludes anonymized players from native retention cohorts", () => {
    const deleted = { id: "deleted", created_at: "2026-10-19T08:00:00Z", platform: "ios", deleted_at: "2026-11-01T08:00:00Z" };
    const result = buildRetention([...players, deleted], [
      { player: "returning", day: "2026-10-20", platform: "ios" },
      { player: "returning", day: "2026-10-26", platform: "ios" },
      { player: "returning", day: "2026-11-18", platform: "ios" },
      { player: "missing", day: "2026-10-20", platform: "android" },
      { player: "deleted", day: "2026-10-20", platform: "ios" },
    ], new Set(["test"]), now);
    expect(result.d1).toEqual({ returned: 2, eligible: 2, rate: 100 });
  });

  it("does not count a new device before its retention day is measurable", () => {
    const result = buildRetention([players[2]!], [], new Set(["test"]), now);
    expect(result.d1.eligible).toBe(0);
    expect(result.d7.eligible).toBe(0);
    expect(result.d30).toEqual({ returned: 0, eligible: 0, rate: null });
  });
});
