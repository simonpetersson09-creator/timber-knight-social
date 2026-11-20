import { GamePlayerCard } from "@/components/GamePlayerCard";
import { GameClock } from "@/components/GameClock";
import { CapturedPieces } from "@/components/CapturedPieces";
import { MoveHistory } from "@/components/MoveHistory";
import { gameAtPly, lastMoveOf } from "@/lib/game-presentation";
import { shouldShowMoveHints } from "@/lib/board-interaction";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import QRCode from "qrcode";
import { ArrowLeft, Eye, Flag, Handshake, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { ChessBoard } from "@/components/ChessBoard";
import { BoardNotice, type BoardNoticeData } from "@/components/BoardNotice";
import { Piece } from "@/components/Piece";
import { Modal } from "@/components/Modal";
import { PromotionPicker } from "@/components/PromotionPicker";
import { useI18n, type Key } from "@/lib/i18n";
import { getCred } from "@/lib/identity";
import { cancelGame, gameAction, getOnlineGame, makeMove, quickMatch, sendChat } from "@/lib/online.functions";
import { displayName, flagOf } from "@/lib/profile";
import { QUICK_WAIT_MS } from "@/lib/online-rules";
import { CHECKMATE_RESULT_DELAY_MS, MATCH_NOTICE_MS } from "@/lib/play-motion";
import { celebrate, feedback } from "@/lib/feedback";
import { hideSearchBanner, noteGameFinished, setGameplayActive, showPostMatchAd, showSearchBanner } from "@/lib/ads";
import { onGameFinished } from "@/lib/rate";
import { CLOCKS, createGame, recordResult } from "@/lib/storage";
import { ResultShareButton } from "@/components/ResultShareButton";
import { report, reportOnce } from "@/lib/report";

export const Route = createFileRoute("/match")({
  validateSearch: z.object({ id: z.string(), level: z.enum(["beginner", "medium", "hard", "master"]).optional(), clock: z.coerce.number().int().min(0).max(4).optional() }),
  head: () => ({
    meta: [
      { title: "Onlineparti – Mr B Chess" },
      { name: "description", content: "Spela schack online mot en vän eller en motståndare." },
      { property: "og:title", content: "Onlineparti – Mr B Chess" },
      { property: "og:description", content: "Spela schack online mot en vän eller en motståndare." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Match,
});

export const CHAT: Key[] = ["chat0", "chat1", "chat2", "chat3", "chat4", "chat5", "chat6", "chat7"];
type Data = Awaited<ReturnType<typeof getOnlineGame>>;

function Match() {
  const { id, level: fallbackLevel = "medium", clock: fallbackClock = 0 } = Route.useSearch();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [d, setD] = useState<Data | null>(null);
  const [chat, setChat] = useState<{ id: number; player: string; phrase: number }[]>([]);
  const [bubble, setBubble] = useState<{ mine: boolean; text: string } | null>(null);
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null);
  const [ask, setAsk] = useState<"resign" | "offerDraw" | "chat" | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [leavingHome, setLeavingHome] = useState(false);
  const [reviewPly, setReviewPly] = useState<number | null>(null);
  const [notice, setNotice] = useState<BoardNoticeData | null>(null);
  const [qr, setQr] = useState("");
  const [started] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  const lastChat = useRef(0);
  const prevPgn = useRef<string | null>(null);
  const prevDrawOffer = useRef<"w" | "b" | null>(null);
  const endHandled = useRef(false);
  const fallbackStarted = useRef(false);
  const leavingRef = useRef(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const game = useRef(new Chess()).current;

  const showNotice = useCallback((text: string, kind: BoardNoticeData["kind"] = "draw") => {
    setNotice({ text, kind });
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), MATCH_NOTICE_MS);
  }, []);

  const notifyCheck = useCallback(() => {
    if (!game.inCheck()) return;
    const kind = game.isCheckmate() ? "checkmate" : "check";
    showNotice(t(kind), kind);
  }, [game, showNotice, t]);

  const load = useCallback(async () => {
    try {
      const r = await getOnlineGame({ data: { ...getCred(), gameId: id, after: lastChat.current } });
      const color = r.game.black === r.me ? "b" : "w";
      const samePosition = r.game.pgn === prevPgn.current;
      if (samePosition && prevDrawOffer.current === color && !r.game.draw_offer && r.game.status === "active") {
        showNotice(t("drawDeclined"));
      }
      if (r.game.draw_offer && r.game.draw_offer !== color && prevDrawOffer.current !== r.game.draw_offer) {
        const opponentId = color === "w" ? r.game.black : r.game.white;
        const opponent = r.players.find((player) => player.id === opponentId);
        showNotice(t("drawOffer", { side: opponent ? displayName(opponent) : "" }));
      }
      prevDrawOffer.current = r.game.draw_offer === "w" || r.game.draw_offer === "b" ? r.game.draw_offer : null;
      if (r.chat.length) {
        const last = r.chat[r.chat.length - 1];
        if (!last) return;
        lastChat.current = last.id;
        setChat((c) => [...c, ...r.chat].slice(-30));
        if (last.player !== r.me) { setBubble({ mine: false, text: t(CHAT[last.phrase] ?? "chat0") }); feedback("move"); }
      }
      if (r.game.pgn !== prevPgn.current) {
        setReviewPly(null);
        game.reset();
        if (r.game.pgn) game.loadPgn(r.game.pgn);
        if (prevPgn.current !== null) { feedback(game.inCheck() ? "check" : "move"); notifyCheck(); }
        prevPgn.current = r.game.pgn;
      }
      setD(r);
    } catch { toast.error(t("error")); void navigate({ to: "/" }); }
  }, [id, game, t, navigate, notifyCheck, showNotice]);

  useEffect(() => { void load(); const i = setInterval(() => void load(), 2000); return () => clearInterval(i); }, [load]);
  useEffect(() => setReviewPly(null), [id]);
  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    if (resultTimer.current) clearTimeout(resultTimer.current);
  }, []);
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(i); }, []);
  useEffect(() => { if (!bubble) return; const x = setTimeout(() => setBubble(null), 3500); return () => clearTimeout(x); }, [bubble]);

  const g = d?.game;
  const me = d?.me;
  const myColor: "w" | "b" = g?.black === me ? "b" : "w";
  const link = g?.code && typeof window !== "undefined" ? `${window.location.origin}/join?code=${g.code}` : "";
  useEffect(() => { if (link) void QRCode.toDataURL(link, { margin: 1, width: 320, color: { dark: "#0b2a2e", light: "#f5ecd7" } }).then(setQr); }, [link]);

  // Give a late opponent precedence, then cancel once and fall back with the chosen local settings.
  useEffect(() => {
    if (g?.kind !== "quick" || g.status !== "waiting") return;
    if (now - started < QUICK_WAIT_MS || fallbackStarted.current) return;
    fallbackStarted.current = true;
    void (async () => {
      try {
        const current = await quickMatch({ data: { ...getCred(), gameId: g.id } });
        if (current.status === "active") return;
        await cancelGame({ data: { ...getCred(), gameId: g.id } });
        toast(t("noOpponent"));
        const local = createGame({ mode: "ai", level: fallbackLevel, human: "w", clock: CLOCKS[fallbackClock] ?? null });
        if (local) {
          report("play", "local_game_started", JSON.stringify({ game: local.id, level: local.level, mode: local.mode, fallback: true }));
          await navigate({ to: "/play", search: { id: local.id }, replace: true });
        } else {
          toast.error(t("maxSaved"));
          await navigate({ to: "/" });
        }
      } catch {
        fallbackStarted.current = false;
        toast.error(t("error"));
      }
    })();
  }, [g?.kind, g?.status, g?.id, now, started, navigate, t, fallbackLevel, fallbackClock]);

  useEffect(() => {
    if (g?.status !== "active") return;
    reportOnce("play", "online_game_started", JSON.stringify({ game: g.id, kind: g.kind }), `online-started:${g.id}`);
  }, [g?.id, g?.kind, g?.status]);

  // Results and statistics complete immediately; the next-match ad only preloads here.
  useEffect(() => {
    if (g?.status !== "finished" || endHandled.current) return;
    endHandled.current = true;
    const won = g.result !== "d" && g.result === myColor;
    recordResult(g.id, g.result === "d" ? "draw" : won ? "win" : "loss", null, g.end_reason !== "resign", "online");
    reportOnce("play", "online_game_finished", JSON.stringify({ game: g.id, kind: g.kind, result: g.result, reason: g.end_reason }), `online-finished:${g.id}`);
    noteGameFinished(g.id);
    setShowResult(false);
    setReviewPly(null);
    resultTimer.current = setTimeout(() => setShowResult(true), g.end_reason === "checkmate" ? CHECKMATE_RESULT_DELAY_MS : 0);
    feedback(won ? "win" : g.result === "d" ? "draw" : "lose");
    if (won) void celebrate();
    void onGameFinished();
  }, [g?.status, g?.result, myColor]);

  useEffect(() => {
    setGameplayActive(g?.status === "active");
    return () => setGameplayActive(false);
  }, [g?.status, id]);

  const players = useMemo(() => Object.fromEntries((d?.players ?? []).map((p) => [p.id, p])), [d?.players]);
  if (!g || !me) return <main className="min-h-dvh" />;

  async function goHome() {
    if (!g || leavingRef.current) return;
    leavingRef.current = true;
    setLeavingHome(true);
    try {
      if (g.status === "finished") await showPostMatchAd(g.id, "home");
      await navigate({ to: "/" });
    } finally {
      leavingRef.current = false;
      setLeavingHome(false);
    }
  }

  if (g.kind === "quick" && g.status === "waiting") {
    return <QuickSearchScreen key={g.id} onCancel={async () => { await cancelGame({ data: { ...getCred(), gameId: g.id } }).catch(() => {}); void navigate({ to: "/" }); }} />;
  }

  if (g.status === "waiting" || g.status === "expired") {
    const remainS = Math.max(0, Math.ceil((QUICK_WAIT_MS - (now - started)) / 1000));
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center gap-5 px-5 pt-[calc(20px+env(safe-area-inset-top))] pb-8 text-center">
        <header className="flex w-full items-center gap-3">
          <Link to="/" className="action-ghost flex size-10 items-center justify-center rounded-full" aria-label={t("back")}><ArrowLeft className="size-5" /></Link>
          <h1 className="brand-wordmark text-3xl">{g.kind === "lobby" ? t("lobby") : g.kind === "quick" ? t("quickMatch") : t("inviteFriend")}</h1>
        </header>
        {g.status === "expired" ? <p className="panel w-full p-5">{t("expired")}</p> : (
          <div className="panel flex w-full flex-col items-center gap-3 p-5">
            <div className="searching"><Piece color="w" type="n" className="size-14" /></div>
            {g.kind === "quick" && <p className="font-semibold">{t("searching")} {remainS}s</p>}
            {g.kind === "invite" && <p className="font-semibold">{t("waitingFor", { name: displayName(players[g.invitee ?? ""] ?? { name: null, player_number: 0 }) })}</p>}
            {g.kind === "lobby" && (
              <>
                <p className="field-label">{t("lobbyCode")}</p>
                <div className="friend-code">{g.code}</div>
                {qr && <img src={qr} alt={t("lobbyCode")} className="size-40 rounded-xl" />}
                <button className="action-btn action-gold" onClick={async () => {
                  if (navigator.share) { try { await navigator.share({ title: "Mr B Chess", text: t("joinMe"), url: link }); } catch { /* cancelled */ } }
                  else { await navigator.clipboard.writeText(link); toast.success(link); }
                }}><Share2 className="size-5" /> {t("shareLink")}</button>
                <p className="text-xs text-muted-foreground">{t("lobbyValid")}</p>
              </>
            )}
            {g.kind === "invite" && <p className="text-xs text-muted-foreground">{t("inviteValid")}</p>}
            {g.host === me && <button className="text-sm text-muted-foreground underline" onClick={async () => { await cancelGame({ data: { ...getCred(), gameId: g.id } }); void navigate({ to: "/" }); }}>{t("cancel")}</button>}
          </div>
        )}
      </main>
    );
  }

  const turn = game.turn();
  const myTurn = g.status === "active" && turn === myColor;
  const oppId = myColor === "w" ? g.black : g.white;
  const opp = oppId ? players[oppId] : null;
  const meP = players[me];
  const deadlineH = Math.min(48, Math.max(0, Math.ceil((new Date(g.expires_at).getTime() - now) / 3_600_000)));

  async function move(from: Square, to: Square, promotion?: "q" | "r" | "b" | "n") {
    const backup = game.pgn();
    try { game.move({ from, to, ...(promotion ? { promotion } : {}) }); } catch { return; }
    prevPgn.current = game.pgn();
    setD((x) => (x ? { ...x } : x));
    feedback(game.inCheck() ? "check" : "move");
    notifyCheck();
    const r = await makeMove({ data: { ...getCred(), gameId: id, from, to, ...(promotion ? { promotion } : {}) } }).catch(() => ({ ok: false }));
    if (!r.ok) { game.reset(); if (backup) game.loadPgn(backup); prevPgn.current = backup; }
    void load();
  }
  function onBoardMove(from: Square, to: Square) {
    if (game.moves({ square: from, verbose: true }).some((m) => m.to === to && m.promotion)) setPromo({ from, to });
    else void move(from, to);
  }
  async function act(action: "resign" | "offerDraw" | "acceptDraw" | "declineDraw") {
    setAsk(null);
    try {
      await gameAction({ data: { ...getCred(), gameId: id, action } });
      if (action === "offerDraw") showNotice(t("drawOffered"));
      else if (action === "declineDraw") showNotice(t("drawDeclined"));
      void load();
    } catch {
      toast.error(t("error"));
    }
  }
  async function say(i: number) {
    setAsk(null);
    setBubble({ mine: true, text: t(CHAT[i] ?? "chat0") });
    await sendChat({ data: { ...getCred(), gameId: id, phrase: i } }).catch(() => {});
  }

  const card = (pid: string | null | undefined, c: "w" | "b") => {
    const p = pid ? players[pid] : null;
    return (
      <GamePlayerCard name={p ? `${displayName(p)}${p.country ? ` ${flagOf(p.country)}` : ""}` : "…"} avatar={p?.avatar} color={c}
        active={g.status === "active" && turn === c ? (c === myColor ? "you" : "opp") : undefined} />
    );
  };
  const clock = (c: "w" | "b") => (
    <GameClock time={g.status === "active" && turn === c ? `${deadlineH}h` : "48h"} color={c}
      active={g.status === "active" && turn === c ? (c === myColor ? "you" : "opp") : undefined} />
  );
  const reasonText = g.end_reason === "resign" ? t("resignNoStats") : g.end_reason === "timeout" ? t("inactiveLoss") : g.end_reason === "checkmate" ? t("checkmate") : t("draw");
  const title = g.result === "d" ? t("draw") : g.result === myColor ? t("youWon") : t("youLost");
  const status = g.status === "finished" ? title : game.inCheck() ? t("check") : myTurn ? t("yourTurn") : t("opponentTurn");
  const boardGame = gameAtPly(game, reviewPly);
  const reviewing = reviewPly !== null;
  void meP;

  return (
    <main className="play-layout">
      <header className="flex w-full max-w-[560px] items-center justify-between">
        <button className="action-ghost flex size-10 items-center justify-center rounded-full" aria-label={t("home")} disabled={leavingHome} onClick={() => void goHome()}><ArrowLeft className="size-5" /></button>
        <span className="brand-wordmark text-2xl">Mr B Chess</span>
        <button className="action-ghost flex size-10 items-center justify-center rounded-full" aria-label={t("quickChat")} disabled={g.status !== "active"} onClick={() => setAsk("chat")}><MessageCircle className="size-5" /></button>
      </header>
      <div className="play-col relative">
        <div className="player-top"><div className="player-profile-line">{card(oppId, myColor === "w" ? "b" : "w")}{clock(myColor === "w" ? "b" : "w")}</div><CapturedPieces game={boardGame} mine={myColor === "w" ? "b" : "w"} /></div>
        <ChessBoard key={reviewing ? `review-${reviewPly}` : "live"} game={boardGame} orientation={myColor} showHints={shouldShowMoveHints("online", null)} disabled={reviewing || !myTurn || !!promo} lastMove={lastMoveOf(boardGame)} onMove={onBoardMove} />
        <div className="player-bottom"><CapturedPieces game={boardGame} mine={myColor} /><div className="player-profile-line">{clock(myColor)}{card(me, myColor)}</div></div>
        <BoardNotice notice={notice} />
        {bubble && <div className="chat-bubble" data-mine={bubble.mine}>{bubble.text}</div>}
      </div>
      <div className="play-side">
        <MoveHistory game={game} reviewPly={reviewPly} onReview={setReviewPly} />
        <div className="game-status">{status}</div>
        {g.draw_offer && g.draw_offer !== myColor && g.status === "active" && (
          <div className="panel flex flex-col gap-2 p-3 text-center">
            <p className="font-semibold">{t("drawOffer", { side: opp ? displayName(opp) : "" })}</p>
            <div className="flex gap-2">
              <button className="action-btn action-ghost !h-11" onClick={() => act("declineDraw")}>{t("decline")}</button>
              <button className="action-btn action-gold !h-11" onClick={() => act("acceptDraw")}>{t("accept")}</button>
            </div>
          </div>
        )}
        <div className="game-actions">
          <Button variant="ghost" onClick={() => setAsk("offerDraw")} disabled={g.status !== "active" || game.history().length < 2 || !!g.draw_offer} className="game-action-button game-action-draw"><Handshake className="size-4" /> {t("offerDraw")}</Button>
          <Button variant="ghost" onClick={() => setAsk("resign")} disabled={g.status !== "active"} className="game-action-button game-action-resign"><Flag className="size-4" /> {t("resign")}</Button>
        </div>
        {g.status === "finished" && !showResult && <button className="action-btn action-gold" disabled={leavingHome} onClick={() => void goHome()}>{t("home")}</button>}
        {chat.length > 0 && (
          <div className="game-chat-history max-h-16 overflow-y-auto text-xs">
            {chat.slice(-6).map((c) => <p key={c.id}><b>{c.player === me ? t("you") : opp ? displayName(opp) : ""}:</b> {t(CHAT[c.phrase] ?? "chat0")}</p>)}
          </div>
        )}
      </div>

      <PromotionPicker
        open={!!promo}
        color={myColor}
        title={t("promote")}
        onCancel={() => setPromo(null)}
        onSelect={(piece) => {
          if (promo) void move(promo.from, promo.to, piece);
          setPromo(null);
        }}
      />
      <Modal open={ask === "offerDraw"} onClose={() => setAsk(null)}>
        <p className="mb-4 text-center font-semibold">{t("offerDraw")}</p>
        <div className="flex gap-2">
          <button className="action-btn action-ghost" onClick={() => setAsk(null)}>{t("cancel")}</button>
          <button className="action-btn action-gold" onClick={() => void act("offerDraw")}>{t("offerDraw")}</button>
        </div>
      </Modal>
      <Modal open={ask === "resign"} onClose={() => setAsk(null)}>
        <p className="mb-2 text-center font-semibold">{t("confirmResign")}</p>
        <p className="mb-4 text-center text-xs text-muted-foreground">{t("resignNoStats")}</p>
        <div className="flex gap-2">
          <button className="action-btn action-ghost" onClick={() => setAsk(null)}>{t("cancel")}</button>
          <button className="action-btn action-gold" onClick={() => act("resign")}>{t("resign")}</button>
        </div>
      </Modal>
      <Modal open={ask === "chat"} onClose={() => setAsk(null)}>
        <p className="mb-3 text-center font-semibold">{t("quickChat")}</p>
        <div className="grid grid-cols-2 gap-2">
          {CHAT.map((k, i) => <button key={k} className="action-btn action-ghost !h-11 text-sm" onClick={() => say(i)}>{t(k)}</button>)}
        </div>
      </Modal>
      <Modal open={showResult} onClose={() => setShowResult(false)}>
        <div className="space-y-4 text-center">
          <Piece color={g.result === "d" ? "w" : (g.result as "w" | "b")} type="k" className="mx-auto size-20" />
          <h2 className="brand-wordmark text-3xl">{title}</h2>
          <p className="text-muted-foreground">{reasonText}</p>
          <ResultShareButton title="Mr B Chess" text={`${title} – ${reasonText} · ${opp ? displayName(opp) : t("playOnline")}`} />
          <button className="action-btn action-ghost" onClick={() => setShowResult(false)}><Eye className="size-4" />{t("close")}</button>
          <button className="action-btn action-gold" disabled={leavingHome} onClick={() => void goHome()}>{t("home")}</button>
        </div>
      </Modal>
    </main>
  );
}

/** Yatzy-style quick search: centred status, progress bar, cancel and a 300×250 ad slot below. */
function QuickSearchScreen({ onCancel }: { onCancel: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    const show = () => { void showSearchBanner(); };
    const first = window.setTimeout(show, 350);
    window.addEventListener("resize", show);
    return () => { window.clearTimeout(first); window.removeEventListener("resize", show); void hideSearchBanner(); };
  }, []);
  return (
    <main className="quick-search-screen">
      <div className="quick-search-layout">
        <div className="quick-search-status">
          <div className="quick-search-icon"><Piece color="w" type="n" className="size-9" /></div>
          <h2 className="font-display text-xl font-bold text-foreground">{t("searching")}</h2>
          <p className="text-sm text-muted-foreground">{t("searchHint")}</p>
          <div className="quick-search-progress"><div style={{ animationDuration: `${QUICK_WAIT_MS}ms` }} /></div>
          <Button variant="secondary" className="h-11 w-full font-semibold" onClick={onCancel}>{t("cancel")}</Button>
        </div>
        <div className="quick-search-ad-area"><div data-search-ad-slot className="quick-search-ad-slot" aria-hidden="true" /></div>
      </div>
    </main>
  );
}
