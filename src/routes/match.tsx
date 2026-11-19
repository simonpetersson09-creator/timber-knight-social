import { GamePlayerCard } from "@/components/GamePlayerCard";
import { CapturedPieces } from "@/components/CapturedPieces";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import QRCode from "qrcode";
import { ArrowLeft, Flag, Handshake, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { ChessBoard } from "@/components/ChessBoard";
import { Piece } from "@/components/Piece";
import { Modal } from "@/components/Modal";
import { useI18n, type Key } from "@/lib/i18n";
import { getCred } from "@/lib/identity";
import { cancelGame, gameAction, getOnlineGame, makeMove, quickMatch, sendChat } from "@/lib/online.functions";
import { displayName, flagOf } from "@/lib/profile";
import { QUICK_WAIT_MS } from "@/lib/online-rules";
import { celebrate, feedback } from "@/lib/feedback";
import { showGameEndAd } from "@/lib/ads";
import { onGameFinished } from "@/lib/rate";
import { createGame } from "@/lib/storage";

export const Route = createFileRoute("/match")({
  validateSearch: z.object({ id: z.string() }),
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
  const { id } = Route.useSearch();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [d, setD] = useState<Data | null>(null);
  const [chat, setChat] = useState<{ id: number; player: string; phrase: number }[]>([]);
  const [bubble, setBubble] = useState<{ mine: boolean; text: string } | null>(null);
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null);
  const [ask, setAsk] = useState<"resign" | "chat" | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [qr, setQr] = useState("");
  const [started] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  const lastChat = useRef(0);
  const prevPgn = useRef<string | null>(null);
  const endHandled = useRef(false);
  const game = useRef(new Chess()).current;

  const load = useCallback(async () => {
    try {
      const r = await getOnlineGame({ data: { ...getCred(), gameId: id, after: lastChat.current } });
      if (r.chat.length) {
        const last = r.chat[r.chat.length - 1];
        if (!last) return;
        lastChat.current = last.id;
        setChat((c) => [...c, ...r.chat].slice(-30));
        if (last.player !== r.me) { setBubble({ mine: false, text: t(CHAT[last.phrase] ?? "chat0") }); feedback("move"); }
      }
      if (r.game.pgn !== prevPgn.current) {
        game.reset();
        if (r.game.pgn) game.loadPgn(r.game.pgn);
        if (prevPgn.current !== null) feedback(game.inCheck() ? "check" : "move");
        prevPgn.current = r.game.pgn;
      }
      setD(r);
    } catch { toast.error(t("error")); void navigate({ to: "/" }); }
  }, [id, game, t, navigate]);

  useEffect(() => { void load(); const i = setInterval(() => void load(), 2000); return () => clearInterval(i); }, [load]);
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(i); }, []);
  useEffect(() => { if (!bubble) return; const x = setTimeout(() => setBubble(null), 3500); return () => clearTimeout(x); }, [bubble]);

  const g = d?.game;
  const me = d?.me;
  const myColor: "w" | "b" = g?.black === me ? "b" : "w";
  const link = g?.code && typeof window !== "undefined" ? `${window.location.origin}/join?code=${g.code}` : "";
  useEffect(() => { if (link) void QRCode.toDataURL(link, { margin: 1, width: 320, color: { dark: "#0b2a2e", light: "#f5ecd7" } }).then(setQr); }, [link]);

  // Quick match: if nobody shows up, play the computer instead.
  useEffect(() => {
    if (g?.kind !== "quick" || g.status !== "waiting") return;
    if (now - started < QUICK_WAIT_MS) return;
    void (async () => {
      await cancelGame({ data: { ...getCred(), gameId: g.id } });
      const r = await quickMatch({ data: { ...getCred(), gameId: g.id } });
      if (r.status === "active") return;
      toast(t("noOpponent"));
      const local = createGame({ mode: "ai", level: "medium", human: Math.random() < 0.5 ? "w" : "b", clock: null });
      if (local) void navigate({ to: "/play", search: { id: local.id }, replace: true });
      else void navigate({ to: "/" });
    })();
  }, [g?.kind, g?.status, g?.id, now, started, navigate, t]);

  // Game end: full-screen ad first, result only after the player closed it.
  useEffect(() => {
    if (g?.status !== "finished" || endHandled.current) return;
    endHandled.current = true;
    const won = g.result !== "d" && g.result === myColor;
    void (async () => {
      await showGameEndAd();
      setShowResult(true);
      feedback(won ? "win" : g.result === "d" ? "draw" : "lose");
      if (won) void celebrate();
      void onGameFinished();
    })();
  }, [g?.status, g?.result, myColor]);

  const players = useMemo(() => Object.fromEntries((d?.players ?? []).map((p) => [p.id, p])), [d?.players]);
  if (!g || !me) return <main className="min-h-dvh" />;

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
    feedback("move");
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
    await gameAction({ data: { ...getCred(), gameId: id, action } }).catch(() => toast.error(t("error")));
    if (action === "offerDraw") toast(t("drawOffered"));
    void load();
  }
  async function say(i: number) {
    setAsk(null);
    setBubble({ mine: true, text: t(CHAT[i] ?? "chat0") });
    await sendChat({ data: { ...getCred(), gameId: id, phrase: i } }).catch(() => {});
  }

  const bar = (pid: string | null | undefined, c: "w" | "b") => {
    const p = pid ? players[pid] : null;
    return (
      <GamePlayerCard name={p ? `${displayName(p)}${p.country ? ` ${flagOf(p.country)}` : ""}` : "…"} avatar={p?.avatar} color={c}
        time={g.status === "active" && turn === c ? `${deadlineH}h` : "48h"}
        active={g.status === "active" && turn === c ? (c === myColor ? "you" : "opp") : undefined} />
    );
  };
  const reasonText = g.end_reason === "resign" ? t("resignNoStats") : g.end_reason === "timeout" ? t("inactiveLoss") : g.end_reason === "checkmate" ? t("checkmate") : t("draw");
  const title = g.result === "d" ? t("draw") : g.result === myColor ? t("youWon") : t("youLost");
  const status = g.status === "finished" ? title : game.inCheck() ? t("check") : myTurn ? t("yourTurn") : t("opponentTurn");
  void meP;

  return (
    <main className="play-layout">
      <header className="flex w-full max-w-[560px] items-center justify-between">
        <Link to="/" className="action-ghost flex size-10 items-center justify-center rounded-full" aria-label={t("home")}><ArrowLeft className="size-5" /></Link>
        <span className="brand-wordmark text-2xl">Mr B Chess</span>
        <button className="action-ghost flex size-10 items-center justify-center rounded-full" aria-label={t("quickChat")} disabled={g.status !== "active"} onClick={() => setAsk("chat")}><MessageCircle className="size-5" /></button>
      </header>
      <div className="play-col relative">
        <div className="player-top">{bar(oppId, myColor === "w" ? "b" : "w")}<CapturedPieces game={game} mine={myColor === "w" ? "b" : "w"} /></div>
        <ChessBoard game={game} orientation={myColor} disabled={!myTurn} lastMove={(() => { const h = game.history({ verbose: true }); const l = h[h.length - 1]; return l ? { from: l.from, to: l.to } : null; })()} onMove={onBoardMove} />
        <div className="player-bottom"><CapturedPieces game={game} mine={myColor} />{bar(me, myColor)}</div>
        {bubble && <div className="chat-bubble" data-mine={bubble.mine}>{bubble.text}</div>}
      </div>
      <div className="play-side">
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
          <Button variant="ghost" onClick={() => act("offerDraw")} disabled={g.status !== "active" || game.history().length < 2 || !!g.draw_offer} className="game-action-button game-action-draw"><Handshake className="size-4" /> {t("offerDraw")}</Button>
          <Button variant="ghost" onClick={() => setAsk("resign")} disabled={g.status !== "active"} className="game-action-button game-action-resign"><Flag className="size-4" /> {t("resign")}</Button>
        </div>
        {chat.length > 0 && (
          <div className="game-chat-history max-h-16 overflow-y-auto text-xs">
            {chat.slice(-6).map((c) => <p key={c.id}><b>{c.player === me ? t("you") : opp ? displayName(opp) : ""}:</b> {t(CHAT[c.phrase] ?? "chat0")}</p>)}
          </div>
        )}
      </div>

      <Modal open={!!promo}>
        <p className="mb-3 text-center font-semibold">{t("promote")}</p>
        <div className="promo-grid">
          {(["q", "r", "b", "n"] as const).map((p) => (
            <button key={p} className="promo-btn" onClick={() => { if (promo) void move(promo.from, promo.to, p); setPromo(null); }}><Piece color={myColor} type={p} className="size-full" /></button>
          ))}
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
      <Modal open={showResult}>
        <div className="space-y-4 text-center">
          <Piece color={g.result === "d" ? "w" : (g.result as "w" | "b")} type="k" className="mx-auto size-20" />
          <h2 className="brand-wordmark text-3xl">{title}</h2>
          <p className="text-muted-foreground">{reasonText}</p>
          <button className="action-btn action-gold" onClick={() => navigate({ to: "/" })}>{t("home")}</button>
        </div>
      </Modal>
    </main>
  );
}
