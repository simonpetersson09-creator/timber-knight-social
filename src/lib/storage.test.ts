import { beforeEach, describe, expect, it, vi } from "vitest";
import { STATS_CHANGED, completeSavedGame, createGame, deleteGame, getGame, getStats, recordResult, rematchConfig, resetStats, saveGame } from "./storage";
describe("local statistics", () => {
  beforeEach(() => localStorage.clear());
  it("keeps mode, level, color and the exact clock for a direct rematch", () => {
    const config = { mode: "ai" as const, level: "master" as const, human: "b" as const, clock: { minutes: 15, inc: 10 } };
    const rematch = rematchConfig(config);
    expect(rematch).toEqual(config);
    expect(rematch.clock).not.toBe(config.clock);
  });
  it("keeps the no-clock choice for a local two-player rematch", () => {
    expect(rematchConfig({ mode: "local", level: "beginner", human: "w", clock: null })).toEqual({ mode: "local", level: "beginner", human: "w", clock: null });
  });
  it("starting, moving, resuming or deleting unfinished games counts zero matches", () => {
    const game = createGame({ mode: "ai", level: "beginner", human: "w", clock: null });
    if (!game) throw new Error("Expected a new game");
    saveGame({ ...game, pgn: "1. e4 e5" });
    expect(getStats().played).toBe(0);
    deleteGame(game.id);
    expect(getStats()).toMatchObject({ played: 0, wins: 0, losses: 0, draws: 0 });
  });
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
  it("a completed draw updates mounted home statistics once and matches detailed totals", () => {
    let notifications = 0;
    let homeStats = getStats();
    const refresh = () => { notifications++; homeStats = getStats(); };
    window.addEventListener(STATS_CHANGED, refresh);
    try {
      recordResult("completed-draw", "draw", "medium", true, "ai");
      recordResult("completed-draw", "draw", "medium", true, "ai");
      expect(notifications).toBe(1);
      expect(homeStats).toMatchObject({ played: 1, wins: 0, losses: 0, draws: 1 });
      expect(homeStats.byMode.ai).toEqual({ played: 1, wins: 0, losses: 0, draws: 1 });
      expect(homeStats.byLevel.medium).toEqual(homeStats.byMode.ai);
      expect(homeStats).toEqual(getStats());
    } finally {
      window.removeEventListener(STATS_CHANGED, refresh);
    }
  });
  it("reset clears statistics without allowing the same game to count again", () => {
    recordResult("1", "win", "hard"); resetStats(); recordResult("1", "win", "hard");
    expect(getStats()).toMatchObject({ played: 0, wins: 0, losses: 0, draws: 0, streak: 0, bestStreak: 0, levelWins: {} });
  });
  it("tracks each level and game mode without changing total results", () => {
    recordResult("a", "win", "beginner", true, "ai");
    recordResult("b", "loss", "master", true, "ai");
    recordResult("c", "draw", "medium", true, "local");
    expect(getStats().byLevel).toMatchObject({ beginner: { played: 1, wins: 1 }, master: { played: 1, losses: 1 }, medium: { played: 1, draws: 1 } });
    expect(getStats().byMode).toMatchObject({ ai: { played: 2, wins: 1, losses: 1 }, local: { played: 1, draws: 1 } });
    expect(getStats().played).toBe(3);
  });
  it("tracks online games by mode without assigning them to a computer level", () => {
    recordResult("online-1", "win", null, true, "online");
    expect(getStats().byMode.online).toMatchObject({ played: 1, wins: 1 });
    expect(getStats().byLevel).toEqual({});
  });
  it("old games cannot count again after 200 games", () => {
    for (let i = 0; i < 205; i++) recordResult(String(i), "win", "beginner");
    recordResult("0", "win", "beginner"); expect(getStats().played).toBe(205);
  });
  it("keeps both players' draw-offer limits when a game is resumed", () => {
    const game = createGame({ mode: "local", level: "beginner", human: "w", clock: null });
    if (!game) throw new Error("Expected a new game");
    saveGame({ ...game, drawOffers: { w: 2, b: 1 } });
    expect(getGame(game.id)?.drawOffers).toEqual({ w: 2, b: 1 });
  });
  it("stores a completed result before deleting the saved position", () => {
    const game = createGame({ mode: "ai", level: "hard", human: "w", clock: null });
    if (!game) throw new Error("Expected a new game");
    const completion = completeSavedGame(game, "win", true);
    expect(completion.stored).toBe(true);
    expect(getStats().played).toBe(1);
    expect(getGame(game.id)).toBeNull();
  });
  it("keeps the final position recoverable when result storage fails", () => {
    const game = createGame({ mode: "ai", level: "hard", human: "w", clock: null });
    if (!game) throw new Error("Expected a new game");
    const original = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === "mrbchess.stats.v1") throw new DOMException("full", "QuotaExceededError");
      original.call(this, key, value);
    });
    try {
      expect(completeSavedGame(game, "win", true).stored).toBe(false);
      expect(getGame(game.id)?.id).toBe(game.id);
      expect(getStats().played).toBe(0);
    } finally { spy.mockRestore(); }
  });
});