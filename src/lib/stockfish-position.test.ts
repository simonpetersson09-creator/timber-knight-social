import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { stockfishPosition } from "./stockfish";

describe("UCI history", () => {
  it("sends every repetition ply instead of only the repeated final FEN", () => {
    const game = new Chess();
    for (const san of ["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"]) game.move(san);
    expect(game.isThreefoldRepetition()).toBe(true);
    expect(stockfishPosition(game)).toBe("position startpos moves g1f3 g8f6 f3g1 f6g8 g1f3 g8f6 f3g1 f6g8");
  });

  it("preserves custom starting positions and promotion suffixes", () => {
    const fen = "7k/P7/8/8/8/8/8/7K w - - 0 1";
    const game = new Chess(fen);
    game.move("a8=Q+");
    expect(stockfishPosition(game)).toBe(`position fen ${fen} moves a7a8q`);
  });
});
