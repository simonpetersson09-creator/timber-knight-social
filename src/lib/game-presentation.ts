import { Chess } from "chess.js";

export function capturedPieces(game: Chess) {
  const out = { w: [] as string[], b: [] as string[] };
  for (const move of game.history({ verbose: true })) if (move.captured) out[move.color].push(move.captured);
  return out;
}

const MATERIAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

/** Positive means white has more material; negative means black leads. */
export function materialBalance(game: Chess): number {
  let balance = 0;
  for (const row of game.board()) for (const piece of row) {
    if (piece) balance += (piece.color === "w" ? 1 : -1) * (MATERIAL[piece.type] ?? 0);
  }
  return balance;
}

/** Builds a separate read-only position for review without changing the live game. */
export function gameAtPly(game: Chess, ply: number | null): Chess {
  if (ply === null) return game;
  const review = new Chess();
  for (const san of game.history().slice(0, Math.max(0, ply))) review.move(san);
  return review;
}

export function lastMoveOf(game: Chess) {
  const move = game.history({ verbose: true }).at(-1);
  return move ? { from: move.from, to: move.to } : null;
}