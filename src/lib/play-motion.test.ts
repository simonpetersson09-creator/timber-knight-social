import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { AI_MOVE_DELAY_MS, assignPieceIds, type BoardPiece, type PieceIds } from "./play-motion";

function pieces(game: Chess): BoardPiece[] {
  return game.board().flat().filter((piece): piece is BoardPiece => piece !== null);
}

function factory() {
  let id = 0;
  return (piece: BoardPiece) => `${piece.color}${piece.type}:${piece.square}-${++id}`;
}

describe("play motion", () => {
  it("gives the computer an 1800 ms pause before calculating", () => {
    expect(AI_MOVE_DELAY_MS).toBe(1800);
  });

  it("keeps the moved pawn identity and all untouched identities", () => {
    const game = new Chess();
    const createId = factory();
    const before = assignPieceIds(pieces(game), {}, null, createId);
    game.move("e4");
    const after = assignPieceIds(pieces(game), before, { from: "e2", to: "e4" }, createId);
    expect(after.e4).toBe(before.e2);
    expect(after.e2).toBeUndefined();
    expect(after.d2).toBe(before.d2);
  });

  it("moves both king and rook identities when castling", () => {
    const game = new Chess();
    for (const move of ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6"]) game.move(move);
    const createId = factory();
    const before: PieceIds = assignPieceIds(pieces(game), {}, null, createId);
    game.move("O-O");
    const after = assignPieceIds(pieces(game), before, { from: "e1", to: "g1" }, createId);
    expect(after.g1).toBe(before.e1);
    expect(after.f1).toBe(before.h1);
  });
});
