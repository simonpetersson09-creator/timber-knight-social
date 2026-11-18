import { Chess, type Move } from "chess.js";

export const LEVELS = ["beginner", "easy", "medium", "hard", "expert", "master"] as const;
export type Level = (typeof LEVELS)[number];

const VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const CENTER = Array.from({ length: 64 }, (_, i) => {
  const r = Math.floor(i / 8), f = i % 8;
  return Math.round(12 - (Math.abs(3.5 - r) + Math.abs(3.5 - f)) * 3);
});

/** Static evaluation in centipawns from White's point of view. */
export function evaluate(game: Chess): number {
  if (game.isCheckmate()) return game.turn() === "w" ? -100000 : 100000;
  if (game.isDraw()) return 0;
  let score = 0;
  game.board().forEach((row, r) =>
    row.forEach((sq, f) => {
      if (!sq) return;
      let v = VALUE[sq.type] ?? 0;
      if (sq.type !== "k") v += CENTER[r * 8 + f] ?? 0;
      if (sq.type === "p") v += (sq.color === "w" ? 6 - r : r - 1) * 6; // pawns like to advance
      score += sq.color === "w" ? v : -v;
    }),
  );
  return score;
}
export const evaluateFen = (fen: string) => evaluate(new Chess(fen));

const order = (moves: Move[]) =>
  moves.sort((a, b) =>
    (b.captured ? (VALUE[b.captured] ?? 0) * 10 - (VALUE[b.piece] ?? 0) : 0) + (b.promotion ? 800 : 0) -
    ((a.captured ? (VALUE[a.captured] ?? 0) * 10 - (VALUE[a.piece] ?? 0) : 0) + (a.promotion ? 800 : 0)));

class Timeout extends Error {}

function search(game: Chess, depth: number, alpha: number, beta: number, max: boolean, deadline: number): number {
  if (Date.now() > deadline) throw new Timeout();
  if (depth === 0 || game.isGameOver()) return evaluate(game);
  const moves = order(game.moves({ verbose: true }));
  let best = max ? -Infinity : Infinity;
  for (const m of moves) {
    game.move(m);
    const s = search(game, depth - 1, alpha, beta, !max, deadline);
    game.undo();
    if (max) { best = Math.max(best, s); alpha = Math.max(alpha, s); }
    else { best = Math.min(best, s); beta = Math.min(beta, s); }
    if (beta <= alpha) break;
  }
  return best;
}

const CFG: Record<Level, { depth: number; random: number; ms: number }> = {
  beginner: { depth: 1, random: 0.55, ms: 400 },
  easy: { depth: 1, random: 0.15, ms: 500 },
  medium: { depth: 2, random: 0, ms: 1500 },
  hard: { depth: 3, random: 0, ms: 2500 },
  expert: { depth: 4, random: 0, ms: 3500 },
  master: { depth: 5, random: 0, ms: 5000 },
};

export function bestMove(fen: string, level: Level): Move | null {
  const game = new Chess(fen);
  const moves = order(game.moves({ verbose: true }));
  if (!moves.length) return null;
  const cfg = CFG[level];
  if (Math.random() < cfg.random) return moves[Math.floor(Math.random() * moves.length)] ?? null;
  const max = game.turn() === "w";
  const deadline = Date.now() + cfg.ms;
  let chosen: Move | null = null;
  // Iterative deepening: keep the best move of the deepest finished search.
  for (let d = 1; d <= cfg.depth; d++) {
    try {
      let best: Move[] = [];
      let bestScore = max ? -Infinity : Infinity;
      for (const m of moves) {
        game.move(m);
        const s = search(game, d - 1, -Infinity, Infinity, !max, deadline);
        game.undo();
        if ((max && s > bestScore) || (!max && s < bestScore)) { bestScore = s; best = [m]; }
        else if (s === bestScore) best.push(m);
      }
      chosen = best[Math.floor(Math.random() * best.length)] ?? chosen;
      if (Math.abs(bestScore) >= 90000) break;
    } catch (e) {
      if (!(e instanceof Timeout)) throw e;
      break;
    }
  }
  return chosen ?? moves[0] ?? null;
}
