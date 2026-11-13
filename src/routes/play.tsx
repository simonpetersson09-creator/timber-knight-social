import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ArrowLeft, RotateCcw, Undo2 } from "lucide-react";
import { ChessBoard } from "@/components/ChessBoard";
import { bestMove, type Level } from "@/lib/engine";

type Search = { mode: "ai" | "local"; level: Level };

export const Route = createFileRoute("/play")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: s["mode"] === "local" ? "local" : "ai",
    level: s["level"] === "easy" || s["level"] === "hard" ? s["level"] : "medium",
  }),
  head: () => ({
    meta: [
      { title: "Parti – Mr B Chess" },
      { name: "description", content: "Ett parti schack på Mr B:s träbräde." },
      { property: "og:title", content: "Parti – Mr B Chess" },
      { property: "og:description", content: "Ett parti schack på Mr B:s träbräde." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Play,
});

const LEVEL = { easy: "Lätt", medium: "Medel", hard: "Svår" };
const GLYPH: Record<string, string> = { q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };

function Play() {
  const { mode, level } = Route.useSearch();
  const [game] = useState(() => new Chess());
  const [, setTick] = useState(0);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [thinking, setThinking] = useState(false);
  const refresh = () => setTick((t) => t + 1);
  const human = "w"; // träpjäser börjar

  const vsAi = mode === "ai";
  const aiTurn = vsAi && game.turn() !== human && !game.isGameOver();

  useEffect(() => {
    if (!aiTurn) return;
    setThinking(true);
    const t = setTimeout(() => {
      const m = bestMove(game.fen(), level);
      if (m) { game.move(m); setLastMove({ from: m.from, to: m.to }); }
      setThinking(false);
      refresh();
    }, 450);
    return () => clearTimeout(t);
  }, [aiTurn, game, level]);

  function onMove(from: Square, to: Square) {
    try {
      const m = game.move({ from, to, promotion: "q" });
      setLastMove({ from: m.from, to: m.to });
      refresh();
    } catch { /* ogiltigt drag */ }
  }

  function undo() {
    game.undo();
    if (vsAi && game.turn() !== human) game.undo();
    const h = game.history({ verbose: true });
    const l = h[h.length - 1];
    setLastMove(l ? { from: l.from, to: l.to } : null);
    refresh();
  }
  function reset() { game.reset(); setLastMove(null); refresh(); }

  const captured = useMemo(() => {
    const out = { w: [] as string[], b: [] as string[] };
    for (const m of game.history({ verbose: true })) if (m.captured) out[m.color].push(m.captured);
    return out;
  }, [game.fen()]);

  const status = game.isCheckmate()
    ? `Schack matt! ${game.turn() === "w" ? "Svart" : "Trä"} vinner`
    : game.isDraw() ? "Remi"
    : game.inCheck() ? "Schack!"
    : thinking ? "Datorn tänker…"
    : `${game.turn() === "w" ? "Trä" : "Svart"} drar`;

  const topName = vsAi ? `Datorn · ${LEVEL[level]}` : "Svart";
  const bottomName = vsAi ? "Du" : "Trä";

  return (
    <main className="flex min-h-dvh flex-col items-center gap-4 px-3 py-5">
      <header className="flex w-full max-w-[560px] items-center justify-between">
        <Link to="/" className="action-ghost flex size-10 items-center justify-center rounded-full" aria-label="Hem">
          <ArrowLeft className="size-5" />
        </Link>
        <span className="brand-wordmark text-2xl">Mr B Chess</span>
        <button onClick={reset} className="action-ghost flex size-10 items-center justify-center rounded-full" aria-label="Nytt parti">
          <RotateCcw className="size-5" />
        </button>
      </header>

      <PlayerBar name={topName} color="b" active={game.turn() === "b"} captured={captured.b} />
      <ChessBoard game={game} orientation="w" disabled={aiTurn || game.isGameOver()} lastMove={lastMove} onMove={onMove} />
      <PlayerBar name={bottomName} color="w" active={game.turn() === "w"} captured={captured.w} />

      <div className="flex w-full max-w-[560px] items-center gap-3">
        <motion.div key={status} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="panel flex-1 px-4 py-3 text-center font-semibold">{status}</motion.div>
        <button onClick={undo} disabled={thinking || game.history().length === 0} className="action-btn action-ghost !w-auto px-4">
          <Undo2 className="size-5" /> Ångra
        </button>
      </div>

      <AnimatePresence>
        {game.isGameOver() && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-6 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="panel w-full max-w-xs space-y-4 p-6 text-center"
              initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
              <div className={`piece ${game.turn() === "w" ? "piece-ebony" : "piece-wood"} text-7xl`}>♚{"\uFE0E"}</div>
              <h2 className="brand-wordmark text-3xl">{game.isCheckmate() ? "Schack matt" : "Remi"}</h2>
              <p className="text-muted-foreground">{status}</p>
              <button onClick={reset} className="action-btn action-gold">Spela igen</button>
              <Link to="/" className="action-btn action-ghost">Till start</Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function PlayerBar({ name, color, active, captured }: { name: string; color: "w" | "b"; active: boolean; captured: string[] }) {
  return (
    <div className={`panel flex w-full max-w-[560px] items-center gap-3 px-3 py-2 transition-shadow ${active ? "ring-2 ring-primary" : ""}`}>
      <span className={`piece ${color === "w" ? "piece-wood" : "piece-ebony"} text-3xl`}>♚{"\uFE0E"}</span>
      <span className="font-semibold">{name}</span>
      <span className="ml-auto flex flex-wrap justify-end text-lg leading-none">
        {captured.map((c, i) => (
          <span key={i} className={`piece ${color === "w" ? "piece-ebony" : "piece-wood"}`}>{GLYPH[c]}{"\uFE0E"}</span>
        ))}
      </span>
    </div>
  );
}
