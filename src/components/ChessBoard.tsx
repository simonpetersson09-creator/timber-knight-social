import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Chess, Square } from "chess.js";
import { assignPieceIds, type BoardPiece, type PieceIds } from "@/lib/play-motion";
import { Piece } from "./Piece";

const FILES = "abcdefgh";

type Props = {
  game: Chess;
  orientation: "w" | "b";
  disabled?: boolean;
  lastMove?: { from: Square; to: Square } | null;
  onMove: (from: Square, to: Square) => void;
};

export function ChessBoard({ game, orientation, disabled, lastMove, onMove }: Props) {
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<Square | null>(null);
  const board = game.board();
  const idsRef = useRef<PieceIds>({});
  const idSequence = useRef(0);
  const currentPieces = board.flat().filter((piece): piece is BoardPiece => piece !== null);
  const pieceIds = useMemo(
    () => assignPieceIds(currentPieces, idsRef.current, lastMove, (piece) => `${piece.color}${piece.type}:${piece.square}-${++idSequence.current}`),
    [game.fen(), lastMove], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => { idsRef.current = pieceIds; }, [pieceIds]);
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

  // Captured pieces: remember last position so the loser can take a humiliating exit.
  const prevRef = useRef<{ fen: string; pieces: BoardPiece[] }>({ fen: game.fen(), pieces: currentPieces });
  const [ghosts, setGhosts] = useState<{ key: string; piece: BoardPiece }[]>([]);
  useEffect(() => {
    const prev = prevRef.current;
    if (prev.fen === game.fen()) return;
    const now = currentPieces;
    const count = (list: BoardPiece[], c: string, t: string) => list.filter((x) => x.color === c && x.type === t).length;
    const lost = prev.pieces.filter((x) => count(now, x.color, x.type) < count(prev.pieces, x.color, x.type)
      && !now.some((n) => n.square === x.square && n.color === x.color && n.type === x.type));
    const victim = lastMove ? lost.find((x) => x.square === lastMove.to) ?? (lost.length === 1 ? lost[0] : null) : null;
    prevRef.current = { fen: game.fen(), pieces: now };
    if (!victim || reduceMotion) return;
    const key = `${victim.square}-${game.fen()}`;
    setGhosts((g) => [...g, { key, piece: victim }]);
    const tm = setTimeout(() => setGhosts((g) => g.filter((x) => x.key !== key)), 1500);
    return () => clearTimeout(tm);
  }, [game.fen()]); // eslint-disable-line react-hooks/exhaustive-deps

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
          {rows.map((r) =>
            cols.map((c) => {
              const sq = `${FILES[c]}${8 - r}` as Square;
              const p = board[r]?.[c];
              const light = (r + c) % 2 === 0;
              const isTarget = targets.has(sq);
              const grainStyle = {
                "--grain-x": `${(c / 7) * 100}%`,
                "--grain-y": `${(r / 7) * 100}%`,
              } as CSSProperties;
              const id = pieceIds[sq] ?? `${p?.color}${p?.type}:${sq}`;
              return (
                <button
                  key={sq}
                  onClick={() => tap(sq)}
                  aria-label={sq}
                  style={grainStyle}
                  className={[
                    "board-square",
                    light ? "sq-light" : "sq-dark",
                    selected === sq && "sq-selected",
                    lastMove && (lastMove.from === sq || lastMove.to === sq) && "sq-last",
                    checkSquare === sq && "sq-check",
                  ].filter(Boolean).join(" ")}
                >
                  {isTarget && <span className={p ? "hint-capture" : "hint-dot"} />}
                  {p && (
                    <motion.span
                      key={id}
                      layoutId={`chess-${id}`}
                      initial={false}
                      animate={{ scale: selected === sq ? 1.06 : 1 }}
                      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 20, mass: 1.1 }}
                      className="piece-slot"
                      data-piece-id={id}
                      data-piece-type={p.type}
                    >
                      <Piece color={p.color} type={p.type} />
                    </motion.span>
                  )}
                </button>
              );
            }),
          )}
        </div>
        <div className="capture-layer" aria-hidden="true">
          {ghosts.map(({ key, piece }) => {
            const ci = cols.indexOf(FILES.indexOf(piece.square.charAt(0)));
            const ri = rows.indexOf(8 - Number(piece.square.charAt(1)));
            // Captor's tray is on the captor's side: bottom when captor matches orientation.
            const dir = piece.color === orientation ? -1 : 1;
            return (
              <motion.span key={key} className="capture-ghost" style={{ left: `${ci * 12.5}%`, top: `${ri * 12.5}%` }}
                initial={{ y: 0, rotate: 0, scale: 1, opacity: 1 }}
                animate={{
                  y: ["0%", "-55%", "0%", "-25%", "0%", `${dir * 420}%`],
                  rotate: [0, -12, 10, -6, 0, 540],
                  scale: [1, 1.1, 0.92, 1.04, 1, 0.45],
                  opacity: [1, 1, 1, 1, 1, 0],
                }}
                transition={{ duration: 1.4, times: [0, 0.14, 0.3, 0.42, 0.52, 1], ease: "easeInOut" }}>
                <Piece color={piece.color} type={piece.type} />
              </motion.span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
