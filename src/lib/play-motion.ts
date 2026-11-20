import type { Color, PieceSymbol, Square } from "chess.js";

export const AI_MOVE_DELAY_MS = 1800;
/** The flying piece and its tray slot become visible at exactly the same time. */
export const CAPTURE_DURATION_MS = 1400;
/** A draw may be proposed at most this many times per game. */
export const MAX_DRAW_OFFERS = 2;

/** The first click only opens confirmation; a confirmed click may send within the limit. */
export function shouldSendDrawOffer(confirmed: boolean, previousOffers: number): boolean {
  return confirmed && previousOffers < MAX_DRAW_OFFERS;
}

export type BoardPiece = { square: Square; color: Color; type: PieceSymbol };
export type PieceIds = Partial<Record<Square, string>>;

/** Keeps a stable identity for each physical piece so shared-layout animation can follow it. */
export function assignPieceIds(
  pieces: BoardPiece[],
  previous: PieceIds,
  lastMove: { from: Square; to: Square } | null | undefined,
  createId: (piece: BoardPiece) => string,
): PieceIds {
  const king = lastMove ? pieces.find((piece) => piece.square === lastMove.to && piece.type === "k") : undefined;
  let rookMove: { from: Square; to: Square } | null = null;
  if (king && lastMove && lastMove.from[0] === "e") {
    const rank = lastMove.from[1];
    if (lastMove.to === `g${rank}`) rookMove = { from: `h${rank}` as Square, to: `f${rank}` as Square };
    if (lastMove.to === `c${rank}`) rookMove = { from: `a${rank}` as Square, to: `d${rank}` as Square };
  }

  const next: PieceIds = {};
  const movedId = lastMove ? previous[lastMove.from] : undefined;
  const rookId = rookMove ? previous[rookMove.from] : undefined;
  for (const piece of pieces) {
    const key = `${piece.color}${piece.type}:`;
    const stationaryId = previous[piece.square];
    if (lastMove && piece.square === lastMove.to && movedId) {
      next[piece.square] = movedId;
    } else if (rookMove && piece.square === rookMove.to && rookId) {
      next[piece.square] = rookId;
    } else if (stationaryId?.startsWith(key)) {
      next[piece.square] = stationaryId;
    } else {
      next[piece.square] = createId(piece);
    }
  }
  return next;
}
