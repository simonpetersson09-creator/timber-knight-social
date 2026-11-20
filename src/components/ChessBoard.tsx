import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Chess, Square } from "chess.js";
import { assignPieceIds, CAPTURE_DURATION_MS, type BoardPiece, type PieceIds } from "@/lib/play-motion";
import { squareAtPoint } from "@/lib/board-interaction";
import { Piece } from "./Piece";

const FILES = "abcdefgh";

type Props = {
  game: Chess;
  orientation: "w" | "b";
  disabled?: boolean;
  lastMove?: { from: Square; to: Square } | null;
  showHints?: boolean;
  onMove: (from: Square, to: Square) => void;
};

export function ChessBoard({ game, orientation, disabled, lastMove, showHints = false, onMove }: Props) {
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<Square | null>(null);
  const [dragging, setDragging] = useState<Square | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
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
  const visibleTargets = showHints ? targets : new Set<string>();
  const checkmate = game.isCheckmate();
  const checkSquare = useMemo(() => {
    if (!game.inCheck()) return null;
    for (const row of board) for (const s of row) if (s && s.type === "k" && s.color === game.turn()) return s.square;
    return null;
  }, [board, game]);

  const rows = orientation === "w" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const cols = orientation === "w" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  // Captured pieces: remember last position so the loser can take a humiliating exit.
  const prevRef = useRef<{ fen: string; pieces: BoardPiece[] }>({ fen: game.fen(), pieces: currentPieces });
  const [ghosts, setGhosts] = useState<{ key: string; piece: BoardPiece; dx: number; dy: number; scale: number }[]>([]);
  const layerRef = useRef<HTMLDivElement>(null);
  // Insert the flying copy before the browser paints the removed board piece.
  useLayoutEffect(() => {
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
    // Fly to the captor's tray: bottom row when the captor plays from the bottom.
    const layer = layerRef.current;
    const lr = layer?.getBoundingClientRect();
    const ci = cols.indexOf(FILES.indexOf(victim.square.charAt(0)));
    const ri = rows.indexOf(8 - Number(victim.square.charAt(1)));
    const bottom = victim.color !== orientation;
    let dx = 0, dy = (bottom ? 1 : -1) * (lr?.height ?? 300) * 0.6, scale = 0.5;
    const tray = layer?.closest(".play-col")?.querySelector(bottom ? ".player-bottom .captured-tray" : ".player-top .captured-tray");
    if (lr && tray) {
      const tr = tray.getBoundingClientRect();
      // Land exactly where the piece will rest: the newest (still hidden) slot in the tray.
      const slots = tray.querySelectorAll(".captured-new");
      const slot = slots[slots.length - 1]?.getBoundingClientRect();
      const sq = lr.width / 8;
      const tx = slot ? slot.left + slot.width / 2 : bottom ? tr.right - 16 : tr.left + 16;
      const ty = slot ? slot.top + slot.height / 2 : tr.top + tr.height / 2;
      dx = tx - (lr.left + (ci + 0.5) * sq);
      dy = ty - (lr.top + (ri + 0.5) * sq);
      scale = Math.min(1, (slot?.height ?? 38) / sq);
    }
    setGhosts((g) => [...g, { key, piece: victim, dx, dy, scale }]);
  }, [game.fen()]); // eslint-disable-line react-hooks/exhaustive-deps

  function tap(sq: Square) {
    if (disabled || suppressClick.current) return;
    const piece = game.get(sq);
    if (selected && targets.has(sq)) {
      onMove(selected, sq);
      setSelected(null);
    } else if (piece && piece.color === game.turn()) {
      setSelected(sq === selected ? null : sq);
    } else setSelected(null);
  }

  function finishDrag(from: Square, point: { x: number; y: number }) {
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
    setDragging(null);
    setSelected(null);
    const rect = gridRef.current?.getBoundingClientRect();
    const to = rect ? squareAtPoint(point, rect, orientation) : null;
    if (!to) return;
    const legal = game.moves({ square: from, verbose: true }).some((move) => move.to === to);
    if (legal) onMove(from, to);
  }

  return (
    <div className="board-scene">
      <div className="board-frame">
        <div ref={gridRef} className="board-grid">
          {rows.map((r) =>
            cols.map((c) => {
              const sq = `${FILES[c]}${8 - r}` as Square;
              const p = board[r]?.[c];
              const light = (r + c) % 2 === 0;
              const isTarget = visibleTargets.has(sq);
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
                    checkSquare === sq && (checkmate ? "sq-checkmate" : "sq-check"),
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
                      drag={!disabled && p.color === game.turn()}
                      dragConstraints={gridRef}
                      dragElastic={0.04}
                      dragMomentum={false}
                      dragSnapToOrigin
                      dragTransition={{ bounceStiffness: 420, bounceDamping: 30 }}
                      whileDrag={{ scale: 1.1, zIndex: 12 }}
                      onDragStart={() => { setSelected(sq); setDragging(sq); }}
                      onDragEnd={(_, info) => finishDrag(sq, info.point)}
                      className="piece-slot"
                      data-piece-id={id}
                      data-piece-type={p.type}
                      data-draggable={!disabled && p.color === game.turn()}
                      data-dragging={dragging === sq}
                    >
                      <Piece color={p.color} type={p.type} />
                    </motion.span>
                  )}
                </button>
              );
            }),
          )}
        </div>
        <div ref={layerRef} className="capture-layer" aria-hidden="true">
          {ghosts.map(({ key, piece, dx, dy, scale }) => {
            const ci = cols.indexOf(FILES.indexOf(piece.square.charAt(0)));
            const ri = rows.indexOf(8 - Number(piece.square.charAt(1)));
            return (
              <motion.span key={key} className="capture-ghost" style={{ left: `${ci * 12.5}%`, top: `${ri * 12.5}%` }}
                initial={{ x: 0, y: 0, rotate: 0, scale: 1 }}
                animate={{
                  x: [0, 0, 0, 0, 0, dx],
                  y: ["0%", "-55%", "0%", "-25%", "0%", `${dy}px`],
                  rotate: [0, -12, 10, -6, 0, 720],
                  scale: [1, 1.1, 0.92, 1.04, 1, scale],
                }}
                transition={{ duration: CAPTURE_DURATION_MS / 1000, times: [0, 0.14, 0.3, 0.42, 0.52, 1], ease: "easeInOut" }}
                onAnimationComplete={() => setGhosts((g) => g.filter((x) => x.key !== key))}>
                <Piece color={piece.color} type={piece.type} />
              </motion.span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
