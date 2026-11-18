import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ArrowLeft, Flag, Handshake, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { ChessBoard } from "@/components/ChessBoard";
import { Piece } from "@/components/Piece";
import { Modal } from "@/components/Modal";
import { bestMove, evaluateFen } from "@/lib/engine";
import { useI18n } from "@/lib/i18n";
import { celebrate, feedback } from "@/lib/feedback";
import { showGameEndAd } from "@/lib/ads";
import { onGameFinished } from "@/lib/rate";
import { createGame, deleteGame, getGame, recordResult, saveGame, type Color, type SavedGame } from "@/lib/storage";

export const Route = createFileRoute("/play")({
  validateSearch: (s: Record<string, unknown>): { id: string } => ({ id: typeof s["id"] === "string" ? s["id"] : "" }),
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

type Result = { winner: Color | null; reason: "checkmate" | "timeout" | "resigned" | "draw" };
const other = (c: Color): Color => (c === "w" ? "b" : "w");

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Play() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useI18n();
  const game = useRef(new Chess()).current;
  const [saved, setSaved] = useState<SavedGame | null>(null);
  const [, setTick] = useState(0);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [thinking, setThinking] = useState(false);
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null);
  const [ask, setAsk] = useState<"resign" | "draw" | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [showEnd, setShowEnd] = useState(false);
  const turnStart = useRef(Date.now());
  const savedRef = useRef<SavedGame | null>(null);
  savedRef.current = saved;
  const refresh = () => setTick((x) => x + 1);

  useEffect(() => {
    const g = getGame(id);
    if (!g) { void navigate({ to: "/" }); return; }
    game.reset();
    if (g.pgn) game.loadPgn(g.pgn);
    const h = game.history({ verbose: true });
    const l = h[h.length - 1];
    setLastMove(l ? { from: l.from, to: l.to } : null);
    setResult(null);
    turnStart.current = Date.now();
    setSaved(g);
  }, [id, game, navigate]);

  const vsAi = saved?.mode === "ai";
  const human: Color = saved?.human ?? "w";
  const aiTurn = !!saved && vsAi && game.turn() !== human && !result;

  const remaining = useCallback((c: Color) => {
    const s = savedRef.current;
    if (!s?.times) return 0;
    return c === game.turn() && !result ? s.times[c] - (Date.now() - turnStart.current) : s.times[c];
  }, [game, result]);

  const finish = useCallback((res: Result) => {
    const s = savedRef.current;
    if (!s) return;
    setResult(res);
    deleteGame(s.id);
    setShowEnd(false);
    void showGameEndAd().then(() => { setShowEnd(true); void onGameFinished(); });
    if (s.mode === "ai") {
      const outcome = res.winner === null ? "draw" : res.winner === s.human ? "win" : "loss";
      const unlocked = recordResult(s.id, outcome, s.level);
      feedback(outcome === "win" ? "win" : outcome === "loss" ? "lose" : "draw");
      if (outcome === "win") void celebrate();
      if (unlocked) setTimeout(() => toast.success(t("unlocked", { level: t(unlocked) })), 900);
    } else {
      feedback(res.winner ? "win" : "draw");
      if (res.winner) void celebrate();
    }
  }, [t]);

  const persist = useCallback((times: SavedGame["times"]) => {
    const s = savedRef.current;
    if (!s) return;
    const n = { ...s, times, pgn: game.pgn() };
    saveGame(n);
    setSaved(n);
  }, [game]);

  const applyMove = useCallback((mv: { from: string; to: string; promotion?: string }) => {
    const s = savedRef.current;
    if (!s) return;
    const mover = game.turn();
    let m;
    try { m = game.move(mv); } catch { return; }
    let times = s.times;
    if (times && s.clock) {
      const used = Date.now() - turnStart.current;
      times = { ...times, [mover]: Math.max(0, times[mover] - used) + s.clock.inc * 1000 };
    }
    turnStart.current = Date.now();
    setLastMove({ from: m.from, to: m.to });
    persist(times);
    refresh();
    if (game.isCheckmate()) { feedback("check"); finish({ winner: mover, reason: "checkmate" }); }
    else if (game.isDraw() || game.isStalemate()) finish({ winner: null, reason: "draw" });
    else feedback(game.inCheck() ? "check" : m.captured ? "capture" : "move");
  }, [game, persist, finish]);

  // Computer move
  useEffect(() => {
    if (!aiTurn || !saved) return;
    setThinking(true);
    const timer = setTimeout(() => {
      const m = bestMove(game.fen(), saved.level);
      setThinking(false);
      if (m) applyMove({ from: m.from, to: m.to, ...(m.promotion ? { promotion: m.promotion } : {}) });
    }, 380);
    return () => clearTimeout(timer);
  }, [aiTurn, saved?.id, game.fen()]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clock ticking + timeout
  useEffect(() => {
    if (!saved?.clock || result) return;
    const iv = setInterval(() => {
      setNow(Date.now());
      const c = game.turn();
      if (remaining(c) <= 0) {
        const times = savedRef.current?.times;
        if (times) persist({ ...times, [c]: 0 });
        finish({ winner: other(c), reason: "timeout" });
      }
    }, 200);
    return () => clearInterval(iv);
  }, [saved?.clock, saved?.id, result, game, remaining, finish, persist]);

  // Pause the clock while the app is in the background
  useEffect(() => {
    const onVis = () => {
      const s = savedRef.current;
      if (!s?.times || result) return;
      if (document.visibilityState === "hidden") {
        const c = game.turn();
        persist({ ...s.times, [c]: Math.max(0, s.times[c] - (Date.now() - turnStart.current)) });
        turnStart.current = Date.now();
      } else turnStart.current = Date.now();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [game, persist, result]);

  function onBoardMove(from: Square, to: Square) {
    const needsPromo = game.moves({ square: from, verbose: true }).some((m) => m.to === to && m.promotion);
    if (needsPromo) setPromo({ from, to });
    else applyMove({ from, to });
  }

  function undo() {
    game.undo();
    if (vsAi && game.turn() !== human) game.undo();
    const h = game.history({ verbose: true });
    const l = h[h.length - 1];
    setLastMove(l ? { from: l.from, to: l.to } : null);
    persist(savedRef.current?.times ?? null);
    refresh();
  }

  function offerDraw() {
    if (vsAi) {
      const ai = other(human);
      const e = evaluateFen(game.fen());
      const aiScore = ai === "w" ? e : -e;
      if (aiScore < -150 || (game.history().length > 60 && Math.abs(aiScore) < 60)) finish({ winner: null, reason: "draw" });
      else toast(t("drawDeclined"));
    } else setAsk("draw");
  }

  function resign() {
    setAsk(null);
    const loser = vsAi ? human : game.turn();
    finish({ winner: other(loser), reason: "resigned" });
  }

  function playAgain() {
    const s = savedRef.current;
    if (!s) return;
    const g = createGame({ mode: s.mode, level: s.level, human: s.human, clock: s.clock });
    if (g) void navigate({ to: "/play", search: { id: g.id }, replace: true });
    else void navigate({ to: "/" });
  }

  const captured = useMemo(() => {
    const out = { w: [] as string[], b: [] as string[] };
    for (const m of game.history({ verbose: true })) if (m.captured) out[m.color].push(m.captured);
    return out;
  }, [game.fen()]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!saved) return <main className="min-h-dvh" />;

  const side = (c: Color) => (c === "w" ? t("wood") : t("black"));
  const top: Color = vsAi ? other(human) : "b";
  const bottom: Color = other(top);
  const nameOf = (c: Color) => (vsAi ? (c === human ? t("you") : `${t("computer")} · ${t(saved.level)}`) : side(c));
  const activeKind = (c: Color): "you" | "opp" | undefined => {
    if (result || game.turn() !== c) return undefined;
    return !vsAi || c === human ? "you" : "opp";
  };
  void now;

  const status = result ? resultText() : game.inCheck() ? t("check") : thinking ? t("thinking") : t("toMove", { side: side(game.turn()) });
  function resultText() {
    if (!result) return "";
    if (result.winner === null) return t("draw");
    const w = side(result.winner);
    if (result.reason === "resigned") return t("resigned", { side: side(other(result.winner)) });
    if (result.reason === "timeout") return `${t("timeout")} – ${t("sideWins", { side: w })}`;
    return `${t("checkmate")} – ${t("sideWins", { side: w })}`;
  }
  const title = !result ? "" : vsAi
    ? result.winner === null ? t("draw") : result.winner === human ? t("youWon") : t("youLost")
    : result.winner === null ? t("draw") : t("sideWins", { side: side(result.winner) });

  const bar = (c: Color) => (
    <div className="panel player-bar" data-active={activeKind(c)}>
      <Piece color={c} type="k" className="size-8" />
      <div className="min-w-0">
        <div className="truncate font-semibold">{nameOf(c)}</div>
        <div className="flex h-4 flex-wrap">
          {captured[c].map((p, i) => <Piece key={i} color={other(c)} type={p} className="-mr-1 size-4" />)}
        </div>
      </div>
      {saved.clock && (
        <div className="clock" data-running={!result && game.turn() === c} data-low={!result && game.turn() === c && remaining(c) < 20000}>
          {fmt(remaining(c))}
        </div>
      )}
    </div>
  );

  const busy = thinking || !!result;
  return (
    <main className="play-layout">
      <header className="flex w-full max-w-[560px] items-center justify-between">
        <Link to="/" className="action-ghost flex size-10 items-center justify-center rounded-full" aria-label={t("home")}>
          <ArrowLeft className="size-5" />
        </Link>
        <span className="brand-wordmark text-2xl">Mr B Chess</span>
        <span className="size-10" />
      </header>

      <div className="play-col">
        {bar(top)}
        <ChessBoard game={game} orientation={vsAi ? human : "w"} disabled={aiTurn || !!result} lastMove={lastMove} onMove={onBoardMove} />
        {bar(bottom)}
      </div>

      <div className="play-side">
        <div key={status} className="panel px-4 py-3 text-center font-semibold">{status}</div>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={undo} disabled={busy || !!saved.clock || game.history().length === 0} className="action-btn action-ghost !h-12 text-sm">
            <Undo2 className="size-4" /> {t("undo")}
          </button>
          <button onClick={offerDraw} disabled={busy || game.history().length < 2} className="action-btn action-ghost !h-12 text-sm">
            <Handshake className="size-4" /> {t("offerDraw")}
          </button>
          <button onClick={() => setAsk("resign")} disabled={busy} className="action-btn action-ghost !h-12 text-sm">
            <Flag className="size-4" /> {t("resign")}
          </button>
        </div>
      </div>

      <Modal open={!!promo}>
        <p className="mb-3 text-center font-semibold">{t("promote")}</p>
        <div className="promo-grid">
          {(["q", "r", "b", "n"] as const).map((p) => (
            <button key={p} className="promo-btn" onClick={() => { if (promo) applyMove({ ...promo, promotion: p }); setPromo(null); }}>
              <Piece color={game.turn()} type={p} className="size-full" />
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={ask === "resign"} onClose={() => setAsk(null)}>
        <p className="mb-4 text-center font-semibold">{t("confirmResign")}</p>
        <div className="flex gap-2">
          <button className="action-btn action-ghost" onClick={() => setAsk(null)}>{t("cancel")}</button>
          <button className="action-btn action-gold" onClick={resign}>{t("resign")}</button>
        </div>
      </Modal>

      <Modal open={ask === "draw"} onClose={() => setAsk(null)}>
        <p className="mb-4 text-center font-semibold">{t("drawOffer", { side: side(game.turn()) })}</p>
        <div className="flex gap-2">
          <button className="action-btn action-ghost" onClick={() => { setAsk(null); toast(t("drawDeclined")); }}>{t("decline")}</button>
          <button className="action-btn action-gold" onClick={() => { setAsk(null); finish({ winner: null, reason: "draw" }); }}>{t("accept")}</button>
        </div>
      </Modal>

      <Modal open={!!result && showEnd}>
        <div className="space-y-4 text-center">
          <Piece color={result?.winner ?? "w"} type="k" className="mx-auto size-20" />
          <h2 className="brand-wordmark text-3xl">{title}</h2>
          <p className="text-muted-foreground">{resultText()}</p>
          <button onClick={playAgain} className="action-btn action-gold">{t("playAgain")}</button>
          <Link to="/" className="action-btn action-ghost">{t("home")}</Link>
        </div>
      </Modal>
    </main>
  );
}
