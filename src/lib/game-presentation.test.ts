import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { capturedPieces } from "./game-presentation";
describe("game rules", () => {
  it("captured pieces belong to the player who captured them", () => {
    const game = new Chess();
    for (const move of ["e4", "d5", "exd5", "Qxd5"]) game.move(move);
    expect(capturedPieces(game)).toEqual({ w: ["p"], b: ["p"] });
  });
});