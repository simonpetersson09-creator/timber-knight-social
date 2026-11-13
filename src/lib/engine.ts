import { Chess, type Move } from "chess.js";

const VALUE: Record<string, number> & { p: number } = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
// Simple centre bonus (index 0..63, a8 first) so the computer develops pieces.
const CENTER = Array.from({ length: 64 }, (_, i) => {
  const r = Math.floor(i / 8), f = i % 8;
  return Math.round(12 - (Math.abs(3.5 - r) + Math.abs(3.5 - f)) * 3);
});

function evaluate(game: Chess): number {
  if (game.isCheckmate()) return game.turn() === "w" ? -100000 : 100000;
  if (game.isDraw()) return 0;
  let score = 0;
  game.board().forEach((row, r) =>
    row.forEach((sq, f) => {
      if (!sq) return;
      const v = (VALUE[sq.type] ?? 0) + (sq.type !== "k" ? (CENTER[r * 8 + f] ?? 0) : 0);
      score += sq.color === "w" ? v : -v;
    }),
  );
  return score;
}

function order(moves: Move[]) {
  return moves.sort((a, b) => (b.captured ? (VALUE[b.captured] ?? 0) : 0) - (a.captured ? (VALUE[a.captured] ?? 0) : 0));
}

function search(game: Chess, depth: number, alpha: number, beta: number, max: boolean): number {
  if (depth === 0 || game.isGameOver()) return evaluate(game);
  const moves = order(game.moves({ verbose: true }));
  if (max) {
    let best = -Infinity;
    for (const m of moves) {
      game.move(m);
      best = Math.max(best, search(game, depth - 1, alpha, beta, false));
      game.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    game.move(m);
    best = Math.min(best, search(game, depth - 1, alpha, beta, true));
    game.undo();
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

export type Level = "easy" | "medium" | "hard";
const DEPTH: Record<Level, number> = { easy: 1, medium: 2, hard: 3 };

export function bestMove(fen: string, level: Level): Move | null {
  const game = new Chess(fen);
  const moves = order(game.moves({ verbose: true }));
  if (!moves.length) return null;
  if (level === "easy" && Math.random() < 0.3) return moves[Math.floor(Math.random() * moves.length)] ?? null;
  const max = game.turn() === "w";
  let best: Move[] = [];
  let bestScore = max ? -Infinity : Infinity;
  for (const m of moves) {
    game.move(m);
    const s = search(game, DEPTH[level] - 1, -Infinity, Infinity, !max);
    game.undo();
    if ((max && s > bestScore) || (!max && s < bestScore)) { bestScore = s; best = [m]; }
    else if (s === bestScore) best.push(m);
  }
  return best[Math.floor(Math.random() * best.length)] ?? null;
}
