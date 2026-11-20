import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ArrowLeft, Eye, Flag, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GamePlayerCard } from "@/components/GamePlayerCard";
import { GameClock } from "@/components/GameClock";
import { CapturedPieces } from "@/components/CapturedPieces";
import { MoveHistory } from "@/components/MoveHistory";
import { gameAtPly, lastMoveOf } from "@/lib/game-presentation";
import { shouldShowMoveHints } from "@/lib/board-interaction";
import { useMe } from "@/hooks/use-me";
import { displayName } from "@/lib/profile";
import { computerDisplayName } from "@/lib/computer-opponent";
import { report } from "@/lib/report";
import { BoardNotice, type BoardNoticeData } from "@/components/BoardNotice";
import { CHECKMATE_RESULT_DELAY_MS, FALLBACK_NOTICE_MS, MATCH_NOTICE_MS, MAX_DRAW_OFFERS, PLAY_FALLBACK_NOTICE, normalizedDrawOffers, playNoticeFromSearch, shouldSendDrawOffer } from "@/lib/play-motion";
import { automaticDrawReason, otherColor, timeoutWinner } from "@/lib/chess-rules";
import { ChessBoard } from "@/components/ChessBoard";
import { Piece } from "@/components/Piece";
import { Modal } from "@/components/Modal";
import { PromotionPicker } from "@/components/PromotionPicker";
import { bestMove, evaluateFen } from "@/lib/engine";
import { stockfishMove, preloadStockfish, cancelStockfish } from "@/lib/stockfish";
import { AI_MOVE_DELAY_MS } from "@/lib/play-motion";
import { useI18n } from "@/lib/i18n";
import { celebrate, feedback } from "@/lib/feedback";
import { noteGameFinished, setGameplayActive, showPostMatchAd } from "@/lib/ads";
import { onGameFinished } from "@/lib/rate";
import { checkpointClock, completeSavedGame, createGame, deleteGame, getGame, rematchConfig, saveGame, type Color, type SavedGame } from "@/lib/storage";
import { ResultShareButton } from "@/components/ResultShareButton";

export const Route = createFileRoute("/play")({
  validateSearch: (s: Record<string, unknown>): { id: string; notice?: typeof PLAY_FALLBACK_NOTICE } => {
    const id = typeof s["id"] === "string" ? s["id"] : "";
    const notice = playNoticeFromSearch(s["notice"]);
    return notice ? { id, notice } : { id };
  },
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
  const { id, notice: noticeParam } = Route.useSearch();
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
  const [ask, setAsk] = useState<"resign" | "offerDraw" | "draw" | null>(null);
  // Persisted separately for both players so resuming cannot reset the limit.
  const [drawOffers, setDrawOffers] = useState<Record<Color, number>>({ w: 0, b: 0 });
  const [notice, setNotice] = useState<BoardNoticeData | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showNotice = (msg: string, kind: BoardNoticeData["kind"] = "draw", ms = MATCH_NOTICE_MS) => {
    setNotice({ text: msg, kind });
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), ms);
  };
  const [now, setNow] = useState(() => Date.now());
  const [showEnd, setShowEnd] = useState(false);
  const [reviewPly, setReviewPly] = useState<number | null>(null);
  const [startingNewGame, setStartingNewGame] = useState(false);
  const startingNewGameRef = useRef(false);
  const paused = useRef(false);
  const [isPaused, setIsPaused] = useState(false);
  const savedRef = useRef<SavedGame | null>(null);
  const finishedGame = useRef<string | null>(null);
  const refresh = () => setTick((x) => x + 1);

  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    if (endTimer.current) clearTimeout(endTimer.current);
  }, []);

  useEffect(() => {
    const g = getGame(id);
    if (!g) { void navigate({ to: "/" }); return; }
    game.reset();
    try { if (g.pgn) game.loadPgn(g.pgn); } catch { deleteGame(id); void navigate({ to: "/" }); return; }
    const h = game.history({ verbose: true });
    const l = h[h.length - 1];
    setLastMove(l ? { from: l.from, to: l.to } : null);
    setResult(null);
    setThinking(false);
    setPromo(null);
    setAsk(null);
    setDrawOffers(normalizedDrawOffers(g.drawOffers));
    setShowEnd(false);
    setReviewPly(null);
    if (endTimer.current) clearTimeout(endTimer.current);
    finishedGame.current = null;
    paused.current = document.visibilityState === "hidden";
    setIsPaused(paused.current);
    const resumed = checkpointClock(g, game.turn(), Date.now(), !paused.current);
    savedRef.current = resumed;
    saveGame(resumed);
    setSaved(resumed);
  }, [id, game, navigate]);

  // A quick search that ended without an opponent says so once, centred on the board.
  const fallbackNoticeShown = useRef(false);
  useEffect(() => {
    if (!saved || noticeParam !== PLAY_FALLBACK_NOTICE || fallbackNoticeShown.current) return;
    fallbackNoticeShown.current = true;
    showNotice(t("noOpponent"), "info", FALLBACK_NOTICE_MS);
    void navigate({ to: "/play", search: { id: saved.id }, replace: true });
  }, [saved, noticeParam, navigate, t]);

  useEffect(() => {
    setGameplayActive(!!saved && !result);
    return () => setGameplayActive(false);
  }, [saved?.id, result]);

  const vsAi = saved?.mode === "ai";
  const human: Color = saved?.human ?? "w";
  const aiTurn = !!saved && vsAi && game.turn() !== human && !result && !isPaused;

  const remaining = useCallback((c: Color) => {
    const s = savedRef.current;
    if (!s?.times) return 0;
    return c === game.turn() && !result ? s.times[c] - (s.clockStartedAt == null ? 0 : Math.max(0, Date.now() - s.clockStartedAt)) : s.times[c];
  }, [game, result]);

  const finish = useCallback((res: Result) => {
    const s = savedRef.current;
    if (!s || finishedGame.current === s.id) return;
    finishedGame.current = s.id;
    setResult(res);
    setThinking(false);
    setPromo(null);
    setAsk(null);
    setShowEnd(false);
    setReviewPly(null);
    const outcome = res.winner === null ? "draw" : res.winner === s.human ? "win" : "loss";
    // Keep an explicit ending too: an agreed draw cannot be inferred from the final PGN.
    const completed: SavedGame = { ...s, completion: { winner: res.winner, reason: res.reason } };
    savedRef.current = completed;
    saveGame(completed);
    setSaved(completed);
    // Never discard the recoverable final position until its result is durably recorded.
    completeSavedGame(completed, outcome, res.reason !== "resigned");
    if (res.reason === "checkmate") showNotice(t("checkmate"), "checkmate");
    endTimer.current = setTimeout(() => setShowEnd(true), res.reason === "checkmate" ? CHECKMATE_RESULT_DELAY_MS : 0);
    noteGameFinished(s.id);
    void onGameFinished();
    report("play", "local_game_finished", JSON.stringify({ game: s.id, reason: res.reason, winner: res.winner, level: s.level }));
    feedback(outcome === "win" ? "win" : outcome === "loss" ? "lose" : "draw");
    if (outcome === "win") void celebrate();
  }, [t]);

  // Recover a game closed between saving the final move and recording its result.
  useEffect(() => {
    if (!saved || result || finishedGame.current === saved.id) return;
    if (saved.completion) finish(saved.completion);
    else if (game.isCheckmate()) finish({ winner: other(game.turn()), reason: "checkmate" });
    else if (automaticDrawReason(game)) finish({ winner: null, reason: "draw" });
  }, [saved, result, game, finish]);

  const persist = useCallback((times: SavedGame["times"]) => {
    const s = savedRef.current;
    if (!s) return;
    const n = { ...s, times, pgn: game.pgn() };
    savedRef.current = n;
    saveGame(n);
    setSaved(n);
  }, [game]);

  const applyMove = useCallback((mv: { from: string; to: string; promotion?: string }) => {
    const s = savedRef.current;
    if (!s || paused.current || finishedGame.current === s.id) return;
    const now = Date.now();
    const mover = game.turn();
    if (s.times && s.times[mover] - (s.clockStartedAt == null ? 0 : Math.max(0, now - s.clockStartedAt)) <= 0) {
      persist({ ...s.times, [mover]: 0 });
      finish({ winner: timeoutWinner(game, mover), reason: "timeout" });
      return;
    }
    let m;
    try { m = game.move(mv); } catch { return; }
    setReviewPly(null);
    let times = s.times;
    if (times && s.clock) {
      const used = s.clockStartedAt == null ? 0 : Math.max(0, now - s.clockStartedAt);
      times = { ...times, [mover]: Math.max(0, times[mover] - used) + s.clock.inc * 1000 };
    }
    savedRef.current = { ...s, clockStartedAt: s.times ? now : null };
    setLastMove({ from: m.from, to: m.to });
    persist(times);
    refresh();
    if (game.isCheckmate()) { feedback("check"); finish({ winner: mover, reason: "checkmate" }); }
    else if (automaticDrawReason(game)) finish({ winner: null, reason: "draw" });
    else if (game.inCheck()) { feedback("check"); showNotice(t("check"), "check"); }
    else feedback(m.captured ? "capture" : "move");
  }, [game, persist, finish, t]);

  useEffect(() => { if (saved?.mode === "ai" && saved.level !== "beginner") preloadStockfish(); }, [saved?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Computer move
  useEffect(() => {
    if (!aiTurn || !saved) return;
    setThinking(true);
    let cancelled = false;
    const fen = game.fen();
    const position = new Chess();
    position.loadPgn(game.pgn());
    const started = Date.now();
    let moveTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(async () => {
      let mv: { from: string; to: string; promotion?: string } | null = null;
      const uci = await stockfishMove(position, saved.level);
      if (cancelled) return;
      if (uci) mv = { from: uci.slice(0, 2), to: uci.slice(2, 4), ...(uci[4] ? { promotion: uci[4] } : {}) };
      else { const m = bestMove(fen, saved.level === "beginner" ? "beginner" : saved.level === "medium" ? "medium" : "expert"); if (m) mv = { from: m.from, to: m.to, ...(m.promotion ? { promotion: m.promotion } : {}) }; }
      // Keep a natural minimum thinking pause even when the engine answers instantly.
      const wait = Math.max(0, AI_MOVE_DELAY_MS - (Date.now() - started));
      moveTimer = setTimeout(() => {
        if (cancelled || game.fen() !== fen) return;
        setThinking(false);
        if (mv) applyMove(mv);
      }, wait);
    }, 0);
    return () => { cancelled = true; clearTimeout(timer); if (moveTimer) clearTimeout(moveTimer); cancelStockfish(); setThinking(false); };
  }, [aiTurn, saved?.id, game.fen()]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clock ticking + timeout
  useEffect(() => {
    if (!saved?.clock || result) return;
    const iv = setInterval(() => {
      if (paused.current || finishedGame.current === savedRef.current?.id) return;
      setNow(Date.now());
      const c = game.turn();
      if (remaining(c) <= 0) {
        const times = savedRef.current?.times;
        if (times) persist({ ...times, [c]: 0 });
        finish({ winner: timeoutWinner(game, c), reason: "timeout" });
      }
    }, 200);
    return () => clearInterval(iv);
  }, [saved?.clock, saved?.id, result, game, remaining, finish, persist]);

  // Persist the debit and anchor synchronously, including same-tick events and route exits.
  useEffect(() => {
    const transition = (running: boolean) => {
      const current = savedRef.current;
      if (!current || current.id !== id || finishedGame.current === current.id || paused.current === !running) return;
      paused.current = !running;
      setIsPaused(!running);
      const next = checkpointClock(current, game.turn(), Date.now(), running);
      savedRef.current = next;
      saveGame(next);
      setSaved(next);
    };
    const onVis = () => transition(document.visibilityState !== "hidden");
    const onHide = () => transition(false);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    onVis();
    let disposed = false;
    let removeNative: (() => void) | undefined;
    void import("@capacitor/app").then(async ({ App }) => {
      const handle = await App.addListener("appStateChange", ({ isActive }) => {
        if (!disposed) transition(isActive && document.visibilityState !== "hidden");
      });
      if (disposed) void handle.remove();
      else removeNative = () => { void handle.remove(); };
    }).catch(() => {});
    return () => {
      disposed = true;
      removeNative?.();
      onHide();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
    };
  }, [id, game]);

  function onBoardMove(from: Square, to: Square) {
    const s = savedRef.current;
    if (paused.current || !s || finishedGame.current === s.id) return;
    const mover = game.turn();
    if (s.times && s.times[mover] - (s.clockStartedAt == null ? 0 : Math.max(0, Date.now() - s.clockStartedAt)) <= 0) {
      persist({ ...s.times, [mover]: 0 });
      finish({ winner: timeoutWinner(game, mover), reason: "timeout" });
      return;
    }
    const needsPromo = game.moves({ square: from, verbose: true }).some((m) => m.to === to && m.promotion);
    if (needsPromo) setPromo({ from, to });
    else applyMove({ from, to });
  }

  function offerDraw(confirmed = false) {
    const offerer = vsAi ? human : game.turn();
    const previous = normalizedDrawOffers(savedRef.current?.drawOffers)[offerer];
    if (!shouldSendDrawOffer(confirmed, previous)) {
      if (previous < MAX_DRAW_OFFERS) setAsk("offerDraw");
      return;
    }
    setAsk(null);
    const next = { ...normalizedDrawOffers(savedRef.current?.drawOffers), [offerer]: previous + 1 };
    setDrawOffers(next);
    const current = savedRef.current;
    if (current) {
      const updated = { ...current, drawOffers: next };
      saveGame(updated);
      savedRef.current = updated;
      setSaved(updated);
    }
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
    finish({ winner: otherColor(loser), reason: "resigned" });
  }

  async function goHomeAfterMatch() {
    const s = savedRef.current;
    if (!s || startingNewGameRef.current) return;
    startingNewGameRef.current = true;
    setStartingNewGame(true);
    try {
      await showPostMatchAd(s.id, "home");
      await navigate({ to: "/" });
    } finally {
      startingNewGameRef.current = false;
      setStartingNewGame(false);
    }
  }

  async function playAgain() {
    const s = savedRef.current;
    if (!s || startingNewGameRef.current) return;
    startingNewGameRef.current = true;
    setStartingNewGame(true);
    try {
      await showPostMatchAd(s.id, "replay");
      const g = createGame(rematchConfig(s));
      if (g) await navigate({ to: "/play", search: { id: g.id }, replace: true });
      else await navigate({ to: "/" });
    } finally {
      startingNewGameRef.current = false;
      setStartingNewGame(false);
    }
  }

  if (!saved) return <main className="min-h-dvh" />;

  const top: Color = other(human);
  const bottom: Color = human;
  const nameOf = (c: Color) => {
    if (vsAi) return c === human ? me ? displayName(me) : t("you") : computerDisplayName(saved.level, t(saved.level));
    return c === human ? me ? displayName(me) : t("playerN", { n: 1 }) : t("playerN", { n: 2 });
  };
  const activeKind = (c: Color): "you" | "opp" | undefined => {
    if (result || game.turn() !== c) return undefined;
    return !vsAi || c === human ? "you" : "opp";
  };
  void now;

  const status = result ? resultText() : game.inCheck() ? t("check") : thinking ? t("thinking") : t("toMove", { side: nameOf(game.turn()) });
  function resultText() {
    if (!result) return "";
    if (result.winner === null) return t("draw");
    const winnerName = nameOf(result.winner);
    if (result.reason === "resigned") return t("resigned", { side: nameOf(other(result.winner)) });
    if (result.reason === "timeout") return `${t("timeout")} – ${t("sideWins", { side: winnerName })}`;
    return `${t("checkmate")} – ${t("sideWins", { side: winnerName })}`;
  }
  const title = !result ? "" : vsAi
    ? result.winner === null ? t("draw") : result.winner === human ? t("youWon") : t("youLost")
    : result.winner === null ? t("draw") : t("sideWins", { side: nameOf(result.winner) });

  const boardGame = gameAtPly(game, reviewPly);
  const reviewing = reviewPly !== null;
  const boardLastMove = reviewing ? lastMoveOf(boardGame) : lastMove;
  const card = (c: Color) => (
    <GamePlayerCard name={nameOf(c)} avatar={c === human ? me?.avatar : undefined} computer={vsAi && c !== human} level={saved.level} color={c}
      active={activeKind(c)} thinking={thinking && vsAi && c !== human} thinkingLabel={t("thinking")} />
  );
  const clock = (c: Color) => (
    <GameClock time={saved.clock ? fmt(remaining(c)) : "∞"} color={c} active={activeKind(c)}
      low={!!saved.clock && !result && game.turn() === c && remaining(c) < 20000} />
  );

  const busy = thinking || !!result;
  return (
    <main className="play-layout">
      <header className="flex w-full max-w-[560px] items-center justify-between">
        <button className="play-back" aria-label={t("home")} disabled={startingNewGame} onClick={() => { if (result) void goHomeAfterMatch(); else void navigate({ to: "/" }); }}>
          <ArrowLeft className="size-5" />
        </button>
        <span className="brand-wordmark play-wordmark text-2xl">Mr B Chess</span>
        <span className="size-11" />
      </header>

      <div className="play-col">
        <div className="player-top"><div className="player-profile-line">{card(top)}{clock(top)}</div><CapturedPieces game={boardGame} mine={top} /></div>
        <ChessBoard key={reviewing ? `review-${reviewPly}` : "live"} game={boardGame} orientation={human} showHints={shouldShowMoveHints(saved.mode, saved.level)} disabled={reviewing || aiTurn || !!result || !!promo} lastMove={boardLastMove} onMove={onBoardMove} />
        <div className="player-bottom"><CapturedPieces game={boardGame} mine={bottom} /><div className="player-profile-line">{clock(bottom)}{card(bottom)}</div></div>
        <BoardNotice notice={notice} />
      </div>

      <div className="play-side">
        <MoveHistory key={saved.id} game={game} reviewPly={reviewPly} onReview={setReviewPly} />
        {result && !showEnd ? (
          <div className="finished-review">
            <button className="finished-review-result" onClick={() => setShowEnd(true)}><Eye className="size-4" />{resultText()}</button>
            <div className="finished-review-actions">
              <button onClick={() => void playAgain()} disabled={startingNewGame} className="action-btn action-gold">{t("playAgain")}</button>
              <button onClick={() => void goHomeAfterMatch()} disabled={startingNewGame} className="action-btn action-ghost">{t("home")}</button>
            </div>
          </div>
        ) : (
          <div className="game-actions">
            <Button variant="ghost" onClick={() => offerDraw()} disabled={busy || game.history().length < 2 || drawOffers[vsAi ? human : game.turn()] >= MAX_DRAW_OFFERS} className="game-action-button game-action-draw">
              <Handshake className="size-4" /> {t("offerDraw")}
            </Button>
            <Button variant="ghost" onClick={() => setAsk("resign")} disabled={busy} className="game-action-button game-action-resign">
              <Flag className="size-4" /> {t("resign")}
            </Button>
          </div>
        )}
      </div>

      <PromotionPicker
        open={!!promo}
        color={game.turn()}
        title={t("promote")}
        onCancel={() => setPromo(null)}
        onSelect={(piece) => {
          if (promo) applyMove({ ...promo, promotion: piece });
          setPromo(null);
        }}
      />

      <Modal open={ask === "resign"} title={t("resign")} onClose={() => setAsk(null)}>
        <p className="mb-4 text-center font-semibold">{t("confirmResign")}</p>
        <div className="flex gap-2">
          <button className="action-btn action-ghost" onClick={() => setAsk(null)}>{t("cancel")}</button>
          <button className="action-btn action-gold" onClick={resign}>{t("resign")}</button>
        </div>
      </Modal>

      <Modal open={ask === "offerDraw"} title={t("offerDraw")} onClose={() => setAsk(null)}>
        <p className="mb-4 text-center font-semibold">{t("offerDraw")}</p>
        <div className="flex gap-2">
          <button className="action-btn action-ghost" onClick={() => setAsk(null)}>{t("cancel")}</button>
          <button className="action-btn action-gold" onClick={() => offerDraw(true)}>{t("offerDraw")}</button>
        </div>
      </Modal>

      <Modal open={ask === "draw"} title={t("offerDraw")} onClose={() => setAsk(null)}>
        <p className="mb-4 text-center font-semibold">{t("drawOffer", { side: nameOf(game.turn()) })}</p>
        <div className="flex gap-2">
          <button className="action-btn action-ghost" onClick={() => { setAsk(null); showNotice(t("drawDeclined")); }}>{t("decline")}</button>
          <button className="action-btn action-gold" onClick={() => { setAsk(null); finish({ winner: null, reason: "draw" }); }}>{t("accept")}</button>
        </div>
      </Modal>

      <Modal open={!!result && showEnd} title={title} onClose={() => setShowEnd(false)}>
        <div className="space-y-4 text-center">
          <Piece color={result?.winner ?? "w"} type="k" className="mx-auto size-20" />
          <h2 className="brand-wordmark text-3xl">{title}</h2>
          <p className="text-muted-foreground">{resultText()}</p>
          <ResultShareButton title="Mr B Chess" text={`${title} – ${resultText()}${vsAi ? ` · ${t(saved.level)}` : ""}`} />
          <button onClick={() => setShowEnd(false)} className="action-btn action-ghost"><Eye className="size-4" />{t("close")}</button>
          <button onClick={() => void playAgain()} disabled={startingNewGame} className="action-btn action-gold">{t("playAgain")}</button>
          <button onClick={() => void goHomeAfterMatch()} disabled={startingNewGame} className="action-btn action-ghost">{t("home")}</button>
        </div>
      </Modal>
    </main>
  );
}
