import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { automaticDrawReason, canPossiblyMate, timeoutWinner } from "./chess-rules";

function after(moves: string[]) {
  const game = new Chess();
  for (const move of moves) game.move(move);
  return game;
}

describe("shared chess completion rules", () => {
  it("detects threefold repetition from the actual position history", () => {
    const game = after(["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"]);
    expect(game.isThreefoldRepetition()).toBe(true);
    expect(automaticDrawReason(game)).toBe("threefold");
  });

  it("does not invent repetition from piece placement alone", () => {
    expect(automaticDrawReason(after(["Nf3", "Nf6"]))).toBeNull();
  });

  it("applies fifty and seventy-five full halfmove limits", () => {
    expect(automaticDrawReason(new Chess("7k/8/8/8/8/8/5R2/K7 w - - 100 80"))).toBe("fifty");
    expect(automaticDrawReason(new Chess("7k/8/8/8/8/8/5R2/K7 w - - 150 100"))).toBe("seventyFive");
  });

  it("lets checkmate take precedence over the seventy-five-move draw", () => {
    const game = new Chess("7k/8/5KQ1/8/8/8/8/8 w - - 149 100");
    game.move("Qg7#");
    expect(game.isCheckmate()).toBe(true);
    expect(automaticDrawReason(game)).toBeNull();
  });

  it("makes timeout a draw against a bare king and a lone minor piece", () => {
    expect(timeoutWinner(new Chess("7k/8/8/8/8/8/5N2/K7 b - - 0 1"), "b")).toBeNull();
    expect(timeoutWinner(new Chess("7k/8/8/8/8/8/5B2/K7 b - - 0 1"), "b")).toBeNull();
  });

  it("allows a timeout win when any legal mating sequence remains possible", () => {
    expect(timeoutWinner(new Chess("7k/8/8/8/8/8/5Q2/K7 b - - 0 1"), "b")).toBe("w");
    expect(timeoutWinner(new Chess("7k/8/8/8/8/8/4NN2/K7 b - - 0 1"), "b")).toBe("w");
    expect(timeoutWinner(new Chess("7k/8/8/8/8/4p3/5N2/K7 b - - 0 1"), "b")).toBe("w");
  });

  it("does not confuse ordinary insufficient material with possible helpmate material", () => {
    expect(canPossiblyMate(new Chess("7k/8/8/8/8/8/5N2/K7 w - - 0 1"), "w")).toBe(false);
    expect(canPossiblyMate(new Chess("7k/8/8/8/8/4p3/5N2/K7 w - - 0 1"), "w")).toBe(true);
  });
});
