import type { Chess } from "chess.js";
export function capturedPieces(game: Chess) {
  const out = { w: [] as string[], b: [] as string[] };
  for (const move of game.history({ verbose: true })) if (move.captured) out[move.color].push(move.captured);
  return out;
}