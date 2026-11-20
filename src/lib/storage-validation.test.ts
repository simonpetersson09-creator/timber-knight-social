import { beforeEach, describe, expect, it } from "vitest";
import { checkpointClock, completeSavedGame, createGame, getGame, getStats, listGames, recordResult, saveGame, turnOf } from "./storage";

const config = { mode: "ai" as const, level: "medium" as const, human: "w" as const, clock: { minutes: 3, inc: 2 } };

describe("validated local persistence", () => {
  beforeEach(() => localStorage.clear());

  it("preserves milliseconds on repeated pause/resume checkpoints without free time", () => {
    const game = createGame(config)!;
    const running = { ...game, clockStartedAt: 1000 };
    const paused = checkpointClock(running, "w", 1234, false);
    saveGame(paused);
    expect(getGame(game.id)?.times?.w).toBe(179766);
    const repeated = checkpointClock(paused, "w", 1300, false);
    expect(repeated.times).toEqual(paused.times);
    const resumed = checkpointClock(repeated, "w", 5000, true);
    const moved = checkpointClock(resumed, "w", 5123, true);
    expect(moved.times?.w).toBe(179643);
    expect(checkpointClock(moved, "w", 5123, false).times).toEqual(moved.times);
    expect(moved.times?.b).toBe(180000);
  });

  it("uses a durable running anchor after abrupt termination and clamps timeout", () => {
    const game = createGame(config)!;
    saveGame({ ...game, clockStartedAt: 1000 });
    const restored = checkpointClock(getGame(game.id)!, "w", 1256, true);
    expect(restored.times?.w).toBe(179744);
    expect(checkpointClock(restored, "w", 999999, false).times?.w).toBe(0);
  });

  it("migrates legacy counters and isolates malformed saves before PGN loading", () => {
    const game = createGame(config)!;
    localStorage.setItem("mrbchess.games.v1", JSON.stringify([null, 4, { ...game, id: "bad", pgn: "not chess" }, { ...game, id: "bad-clock", times: { w: -1, b: 1 } }, { ...game, drawOffers: undefined }]));
    expect(listGames()).toHaveLength(1);
    expect(getGame(game.id)?.drawOffers).toEqual({ w: 0, b: 0 });
    expect(getGame("bad")).toBeNull();
    expect(turnOf("not chess")).toBe("w");
    expect(getStats().played).toBe(0);
    expect(completeSavedGame({ ...game, pgn: "not chess" }, "win", true).stored).toBe(false);
    expect(getStats().played).toBe(0);
  });

  it("rejects malformed containers and enforces three saves on direct writes", () => {
    for (const value of [null, {}, "bad", 7]) {
      localStorage.setItem("mrbchess.games.v1", JSON.stringify(value));
      expect(listGames()).toEqual([]);
    }
    const game = createGame(config)!;
    for (let i = 0; i < 5; i++) saveGame({ ...game, id: String(i) });
    expect(listGames()).toHaveLength(3);
  });

  it("sanitizes nested stats, retains dedup IDs and never shares defaults", () => {
    const first = getStats();
    first.recorded.push("phantom");
    first.byMode.ai = { played: 99, wins: 99, losses: 0, draws: 0 };
    expect(getStats().recorded).toEqual([]);
    expect(getStats().byMode).toEqual({});
    localStorage.setItem("mrbchess.stats.v1", JSON.stringify({ wins: "bad", played: -1, byLevel: { medium: null }, byMode: [], levelWins: null, recorded: ["seen", null, "seen", 4] }));
    expect(getStats().recorded).toEqual(["seen"]);
    expect(getStats()).not.toHaveProperty("levelWins");
    recordResult("seen", "win", "medium");
    expect(getStats().played).toBe(0);
    recordResult("new", "win", "medium");
    expect(getStats().byLevel.medium?.wins).toBe(1);
    expect(getStats().byMode.ai?.wins).toBe(1);
  });
});
