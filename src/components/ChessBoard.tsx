import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Chess, Square } from "chess.js";
import { Piece } from "./Piece";

const FILES = "abcdefgh";

type Props = {
  game: Chess;
  orientation: "w" | "b";
  disabled?: boolean;
  lastMove?: { from: string; to: string } | null;
  onMove: (from: Square, to: Square) => void;
};

export function ChessBoard({ game, orientation, disabled, lastMove, onMove }: Props) {
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<Square | null>(null);
  const board = game.board();
  const targets = useMemo(
    () => (selected ? new Set(game.moves({ square: selected, verbose: true }).map((m) => m.to)) : new Set<string>()),
    [selected, game, game.fen()],
  );
  const checkSquare = useMemo(() => {
    if (!game.inCheck()) return null;
    for (const row of board) for (const s of row) if (s && s.type === "k" && s.color === game.turn()) return s.square;
    return null;
  }, [board, game]);

  const rows = orientation === "w" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const cols = orientation === "w" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  function tap(sq: Square) {
    if (disabled) return;
    const piece = game.get(sq);
    if (selected && targets.has(sq)) {
      onMove(selected, sq);
      setSelected(null);
    } else if (piece && piece.color === game.turn()) {
      setSelected(sq === selected ? null : sq);
    } else setSelected(null);
  }

  return (
    <div className="board-scene">
    <div className="board-frame">
      <div className="board-grid">
        {rows.map((r, ri) =>
          cols.map((c, ci) => {
            const sq = `${FILES[c]}${8 - r}` as Square;
            const p = board[r]?.[c];
            const light = (r + c) % 2 === 0;
            const isTarget = targets.has(sq);
            return (
              <button
                key={sq}
                onClick={() => tap(sq)}
                aria-label={sq}
                className={[
                  "board-square",
                  light ? "sq-light" : "sq-dark",
                  selected === sq && "sq-selected",
                  lastMove && (lastMove.from === sq || lastMove.to === sq) && "sq-last",
                  checkSquare === sq && "sq-check",
                ].filter(Boolean).join(" ")}
              >
                {ci === 0 && <span className="coord coord-rank">{8 - r}</span>}
                {ri === 7 && <span className="coord coord-file">{FILES[c]}</span>}
                {isTarget && <span className={p ? "hint-capture" : "hint-dot"} />}
                {p && (
                  <motion.span
                    key={`${sq}-${p.color}${p.type}`}
                    initial={reduceMotion ? false : { scale: 0.85, opacity: 0 }}
                    animate={{ scale: selected === sq ? 1.12 : 1, opacity: 1, y: selected === sq ? -4 : 0 }}
                    transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 24 }}
                    className="piece-slot"
                  >
                    <Piece color={p.color} type={p.type} />
                  </motion.span>
                )}
              </button>
            );
          }),
        )}
      </div>
    </div>
    </div>
  );
}
