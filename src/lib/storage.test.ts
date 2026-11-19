import { beforeEach, describe, expect, it } from "vitest";
import { getStats, recordResult, resetStats } from "./storage";
describe("local statistics", () => {
  beforeEach(() => localStorage.clear());
  it("resigned computer games do not change any statistics", () => {
    recordResult("1", "win", "beginner");
    recordResult("2", "loss", "beginner", false);
    expect(getStats()).toMatchObject({ played: 1, wins: 1, losses: 0, streak: 1 });
  });
  it("counts wins losses draws and consecutive wins exactly once", () => {
    recordResult("1", "loss", "beginner"); recordResult("2", "draw", "medium");
    recordResult("3", "win", "hard"); recordResult("4", "win", "hard"); recordResult("4", "win", "hard");
    expect(getStats()).toMatchObject({ played: 4, wins: 2, losses: 1, draws: 1, streak: 2, bestStreak: 2 });
  });
  it("reset clears statistics without allowing the same game to count again", () => {
    recordResult("1", "win", "hard"); resetStats(); recordResult("1", "win", "hard");
    expect(getStats()).toMatchObject({ played: 0, wins: 0, losses: 0, draws: 0, streak: 0, bestStreak: 0, levelWins: {} });
  });
  it("old games cannot count again after 200 games", () => {
    for (let i = 0; i < 205; i++) recordResult(String(i), "win", "beginner");
    recordResult("0", "win", "beginner"); expect(getStats().played).toBe(205);
  });
});