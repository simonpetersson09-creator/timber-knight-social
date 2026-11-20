import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { AI_MOVE_DELAY_MS, CAPTURE_DURATION_MS, CHECKMATE_RESULT_DELAY_MS, MATCH_NOTICE_MS, MAX_DRAW_OFFERS, assignPieceIds, shouldSendDrawOffer, type BoardPiece, type PieceIds } from "./play-motion";

function pieces(game: Chess): BoardPiece[] {
  return game.board().flat().filter((piece): piece is BoardPiece => piece !== null);
}

function factory() {
  let id = 0;
  return (piece: BoardPiece) => `${piece.color}${piece.type}:${piece.square}-${++id}`;
}

describe("play motion", () => {
  it("allows proposing a draw at most twice", () => { expect(MAX_DRAW_OFFERS).toBe(2); });
  it("requires a second confirmation before sending a draw offer", () => {
    expect(shouldSendDrawOffer(false, 0)).toBe(false);
    expect(shouldSendDrawOffer(true, 0)).toBe(true);
  });
  it("does not send a confirmed draw offer after two earlier offers", () => {
    expect(shouldSendDrawOffer(true, 2)).toBe(false);
  });
  it("gives the computer an 1800 ms pause before calculating", () => {
    expect(AI_MOVE_DELAY_MS).toBe(1800);
  });
  it("keeps the flying piece and tray handoff at the same 1400 ms boundary", () => {
    expect(CAPTURE_DURATION_MS).toBe(1400);
  });
  it("closes the checkmate notice before opening the result dialog", () => {
    expect(MATCH_NOTICE_MS).toBe(2400);
    expect(CHECKMATE_RESULT_DELAY_MS).toBeGreaterThan(MATCH_NOTICE_MS);
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
