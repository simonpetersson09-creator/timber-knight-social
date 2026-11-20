import { describe, expect, it } from "vitest";
import { createOnlineReadGuard, onlineGameCountsForStats, statsFor } from "./online-rules";

describe("online read ordering", () => {
  it("rejects an earlier request after a newer request starts", () => {
    const guard = createOnlineReadGuard();
    const older = guard.begin()!;
    const newer = guard.begin()!;
    expect(guard.accepts(older)).toBe(false);
    expect(guard.accepts(newer)).toBe(true);
  });

  it("rejects pre-move responses and blocks reads until the write completes", () => {
    const guard = createOnlineReadGuard();
    const beforeMove = guard.begin()!;
    guard.block();
    expect(guard.accepts(beforeMove)).toBe(false);
    expect(guard.begin()).toBeNull();
    guard.unblock();
    const afterMove = guard.begin()!;
    expect(guard.accepts(beforeMove)).toBe(false);
    expect(guard.accepts(afterMove)).toBe(true);
  });

  it("rejects old responses after cleanup or match replacement", () => {
    const oldMatch = createOnlineReadGuard();
    const oldTicket = oldMatch.begin()!;
    oldMatch.dispose();
    const newMatch = createOnlineReadGuard();
    const newTicket = newMatch.begin()!;
    expect(oldMatch.accepts(oldTicket)).toBe(false);
    expect(oldMatch.begin()).toBeNull();
    expect(newMatch.accepts(newTicket)).toBe(true);
  });
});

describe("online completion eligibility", () => {
  it.each(["checkmate", "timeout", "draw", "agreed"])("counts a finished %s result", (reason) => {
    expect(onlineGameCountsForStats({ status: "finished", result: reason === "draw" || reason === "agreed" ? "d" : "w", end_reason: reason })).toBe(true);
  });

  it.each(["waiting", "active", "expired", "closed"])("never counts status %s", (status) => {
    expect(onlineGameCountsForStats({ status, result: "w", end_reason: "checkmate" })).toBe(false);
  });

  it("never counts resignation or a missing result", () => {
    expect(onlineGameCountsForStats({ status: "finished", result: "b", end_reason: "resign" })).toBe(false);
    expect(onlineGameCountsForStats({ status: "finished", result: null, end_reason: null })).toBe(false);
  });

  it("keeps resignation and closed matches out of every aggregate", () => {
    const rows = [
      { status: "closed", result: "b", end_reason: null },
      { status: "finished", result: "b", end_reason: "resign" },
      { status: "finished", result: "w", end_reason: "checkmate" },
      { status: "finished", result: "d", end_reason: "draw" },
      { status: "finished", result: "b", end_reason: "timeout" },
    ] as const;
    expect(statsFor("me", rows.map((game) => ({ white: "me", black: "other", result: game.result, counts: onlineGameCountsForStats(game), finished_at: "" })))).toEqual({ played: 3, wins: 1, losses: 1, draws: 1, winRate: 33, streak: 1 });
  });
});
