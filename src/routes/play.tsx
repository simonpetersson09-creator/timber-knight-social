import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ArrowLeft, Flag, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GamePlayerCard } from "@/components/GamePlayerCard";
import { GameClock } from "@/components/GameClock";
import { CapturedPieces } from "@/components/CapturedPieces";
import { useMe } from "@/hooks/use-me";
import { displayName } from "@/lib/profile";
import { report } from "@/lib/report";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { MAX_DRAW_OFFERS } from "@/lib/play-motion";
import { ChessBoard } from "@/components/ChessBoard";
import { Piece } from "@/components/Piece";
import { Modal } from "@/components/Modal";
import { bestMove, evaluateFen } from "@/lib/engine";
import { stockfishMove, preloadStockfish } from "@/lib/stockfish";
import { AI_MOVE_DELAY_MS } from "@/lib/play-motion";
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
  const { me } = useMe();
  const game = useRef(new Chess()).current;
  const [saved, setSaved] = useState<SavedGame | null>(null);
  const [, setTick] = useState(0);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [thinking, setThinking] = useState(false);
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null);
  const [ask, setAsk] = useState<"resign" | "draw" | null>(null);
  // Each player may propose a draw at most twice per game.
  const [drawOffers, setDrawOffers] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showNotice = (msg: string) => {
    setNotice(msg);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2400);
  };
  const [now, setNow] = useState(() => Date.now());
  const [showEnd, setShowEnd] = useState(false);
  const turnStart = useRef(Date.now());
  const savedRef = useRef<SavedGame | null>(null);
  const finishedGame = useRef<string | null>(null);
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
    finishedGame.current = null;
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
    if (!s || finishedGame.current === s.id) return;
    finishedGame.current = s.id;
    setResult(res);
    deleteGame(s.id);
    setShowEnd(false);
    void showGameEndAd().then(() => { setShowEnd(true); void onGameFinished(); });
    report("play", "local_game_finished", JSON.stringify({ game: s.id, reason: res.reason, winner: res.winner, level: s.level }));
    if (s.mode === "ai") {
      const outcome = res.winner === null ? "draw" : res.winner === s.human ? "win" : "loss";
      const unlocked = recordResult(s.id, outcome, s.level, res.reason !== "resigned");
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

  useEffect(() => { if (saved?.mode === "ai" && saved.level !== "beginner") preloadStockfish(); }, [saved?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Computer move
  useEffect(() => {
    if (!aiTurn || !saved) return;
    setThinking(true);
    let cancelled = false;
    const fen = game.fen();
    const started = Date.now();
    const timer = setTimeout(async () => {
      let mv: { from: string; to: string; promotion?: string } | null = null;
      const uci = await stockfishMove(fen, saved.level);
      if (uci) mv = { from: uci.slice(0, 2), to: uci.slice(2, 4), ...(uci[4] ? { promotion: uci[4] } : {}) };
      else { const m = bestMove(fen, saved.level === "beginner" ? "beginner" : saved.level === "medium" ? "medium" : "expert"); if (m) mv = { from: m.from, to: m.to, ...(m.promotion ? { promotion: m.promotion } : {}) }; }
      // Keep a natural minimum thinking pause even when the engine answers instantly.
      const wait = Math.max(0, AI_MOVE_DELAY_MS - (Date.now() - started));
      setTimeout(() => {
        if (cancelled || game.fen() !== fen) return;
        setThinking(false);
        if (mv) applyMove(mv);
      }, wait);
    }, 0);
    return () => { cancelled = true; clearTimeout(timer); };
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

  function offerDraw() {
    if (drawOffers >= MAX_DRAW_OFFERS) return;
    setDrawOffers((n) => n + 1);
    if (vsAi) {
      const ai = other(human);
      const e = evaluateFen(game.fen());
      const aiScore = ai === "w" ? e : -e;
      if (aiScore < -150 || (game.history().length > 60 && Math.abs(aiScore) < 60)) finish({ winner: null, reason: "draw" });
      else showNotice(t("drawDeclined"));
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

  if (!saved) return <main className="min-h-dvh" />;

  const side = (c: Color) => (c === "w" ? t("ivory") : t("black"));
  const top: Color = vsAi ? other(human) : "b";
  const bottom: Color = other(top);
  const nameOf = (c: Color) => (vsAi ? (c === human ? me ? displayName(me) : t("you") : `${t("computer")} · ${t(saved.level)}`) : side(c));
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

  const card = (c: Color) => (
    <GamePlayerCard name={nameOf(c)} avatar={c === human ? me?.avatar : undefined} computer={vsAi && c !== human} color={c}
      active={activeKind(c)} />
  );
  const clock = (c: Color) => (
    <GameClock time={saved.clock ? fmt(remaining(c)) : "∞"} color={c} active={activeKind(c)}
      low={!!saved.clock && !result && game.turn() === c && remaining(c) < 20000} />
  );

  const busy = thinking || !!result;
  return (
    <main className="play-layout">
      <header className="flex w-full max-w-[560px] items-center justify-between">
        <Link to="/" className="play-back" aria-label={t("home")}>
          <ArrowLeft className="size-5" />
        </Link>
        <span className="brand-wordmark play-wordmark text-2xl">Mr B Chess</span>
        <span className="size-10" />
      </header>

      <div className="play-col">
        <div className="player-top"><div className="player-profile-line">{card(top)}</div><CapturedPieces game={game} mine={top} /></div>
        <ChessBoard game={game} orientation={vsAi ? human : "w"} disabled={aiTurn || !!result} lastMove={lastMove} onMove={onBoardMove} />
        <div className="player-bottom"><CapturedPieces game={game} mine={bottom} /><div className="player-profile-line">{card(bottom)}</div></div>
        <AnimatePresence>
          {notice && (
            <motion.div key={notice} className="board-notice" role="status"
              initial={{ opacity: 0, scale: 0.85, x: "-50%", y: "-40%" }} animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
              exit={{ opacity: 0, scale: 0.92, x: "-50%", y: "-50%" }} transition={{ type: "spring", stiffness: 320, damping: 24 }}>
              <Handshake className="size-5" />{notice}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="play-side">
        <div className="game-actions">
          <div className="game-clock-card" aria-label="clock">{clock(result ? bottom : game.turn())}</div>
          <span aria-hidden="true" />
          <Button variant="ghost" onClick={offerDraw} disabled={busy || game.history().length < 2 || drawOffers >= MAX_DRAW_OFFERS} className="game-action-button game-action-draw">
            <Handshake className="size-4" /> {t("offerDraw")}
          </Button>
          <Button variant="ghost" onClick={() => setAsk("resign")} disabled={busy} className="game-action-button game-action-resign">
            <Flag className="size-4" /> {t("resign")}
          </Button>
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
          <button className="action-btn action-ghost" onClick={() => { setAsk(null); showNotice(t("drawDeclined")); }}>{t("decline")}</button>
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
