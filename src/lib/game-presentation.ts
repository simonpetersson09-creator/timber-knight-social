import type { Chess } from "chess.js";
const ORDER = ["q", "r", "b", "n", "p"];
export function capturedPieces(game: Chess) {
  const out = { w: [] as string[], b: [] as string[] };
  for (const move of game.history({ verbose: true })) if (move.captured) out[move.color].push(move.captured);
  for (const list of Object.values(out)) list.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  return out;
}