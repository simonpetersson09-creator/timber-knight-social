import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { capturedPieces, gameAtPly, lastMoveOf, materialBalance, MAX_REVIEW_PLIES, stepReviewPly } from "./game-presentation";
describe("game rules", () => {
  it("captured pieces belong to the player who captured them", () => {
    const game = new Chess();
    for (const move of ["e4", "d5", "exd5", "Qxd5"]) game.move(move);
    expect(capturedPieces(game)).toEqual({ w: ["p"], b: ["p"] });
  });

  it("values captured material as 1/3/3/5/9 and signs the leader", () => {
    const game = new Chess();
    for (const move of ["e4", "e5", "Qh5", "Nc6", "Qxe5+", "Nxe5"]) game.move(move);
    expect(capturedPieces(game)).toEqual({ w: ["p"], b: ["q"] });
    expect(materialBalance(game)).toBe(-8);
  });

  it("counts promoted material at its new value", () => {
    const game = new Chess("8/P7/8/8/8/8/k6K/8 w - - 0 1");
    expect(materialBalance(game)).toBe(1);
    game.move({ from: "a7", to: "a8", promotion: "q" });
    expect(materialBalance(game)).toBe(9);
  });

  it("builds review positions without changing the live game", () => {
    const game = new Chess();
    for (const move of ["e4", "e5", "Nf3"]) game.move(move);
    const liveFen = game.fen();
    const review = gameAtPly(game, 1);
    const afterE4 = new Chess();
    afterE4.move("e4");
    expect(review.fen()).toBe(afterE4.fen());
    expect(lastMoveOf(review)).toEqual({ from: "e2", to: "e4" });
    expect(game.fen()).toBe(liveFen);
    expect(gameAtPly(game, null)).toBe(game);
  });

  it("steps backward and forward one move and returns to the live position", () => {
    expect(stepReviewPly(3, null, "back")).toBe(2);
    expect(stepReviewPly(3, 2, "back")).toBe(1);
    expect(stepReviewPly(3, 1, "forward")).toBe(2);
    expect(stepReviewPly(3, 2, "forward")).toBeNull();
    expect(stepReviewPly(3, null, "forward")).toBeNull();
  });

  it("never steps further than ten moves behind the live position", () => {
    let ply: number | null = null;
    for (let i = 0; i < 15; i++) ply = stepReviewPly(12, ply, "back");
    expect(MAX_REVIEW_PLIES).toBe(10);
    expect(ply).toBe(2);
    expect(stepReviewPly(12, ply, "back")).toBe(2);
  });
});