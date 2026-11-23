import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Globe, Settings, Users, UserPlus, Cpu, Infinity as InfinityIcon, Trophy, ChevronDown, Gamepad2, Percent, Handshake, Flame, Play, Send, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getCred } from "@/lib/identity";
import { useMe } from "@/hooks/use-me";
import { cancelGame, joinGame, myOnline, quickMatch } from "@/lib/online.functions";
import { Button } from "@/components/ui/button";
import { BrandIcon } from "@/components/BrandIcon";
import { PlayerAvatar } from "@/components/PlayerAvatar";

import { displayName } from "@/lib/profile";
import { report } from "@/lib/report";

import { LanguageSheet } from "@/components/LanguageSheet";
import { type Level } from "@/lib/engine";
import { useI18n } from "@/lib/i18n";
import {
  CLOCKS, MAX_SAVED, STATS_CHANGED, clockLabel, createGame, deleteGame, getStats, listGames, turnOf,
  type SavedGame, type Stats,
} from "@/lib/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mr B Chess – Ladda ner och spela schack" },
      { name: "description", content: "Ladda ner Mr B Chess och spela schack på ett handgjort träbräde mot datorn eller vänner." },
      { property: "og:title", content: "Mr B Chess – Ladda ner och spela schack" },
      { property: "og:description", content: "Ladda ner Mr B Chess och spela schack på ett handgjort träbräde mot datorn eller vänner." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

const QUICK_LEVELS = ["beginner", "medium", "hard", "master"] as const satisfies readonly Level[];

const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

function Home() {
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();
  const navigate = useNavigate();
  const [games, setGames] = useState<SavedGame[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [open, setOpen] = useState<"ai" | null>(null);
  const { me } = useMe();
  const [online, setOnline] = useState<OnlineRow[]>([]);
  const [closingOnline, setClosingOnline] = useState<string | null>(null);
  const closingRef = useRef(false);
  const [level, setLevel] = useState<(typeof QUICK_LEVELS)[number]>("beginner");
  const [clock, setClock] = useState(0);
  const [langOpen, setLangOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [quickTop, setQuickTop] = useState<number | null>(null);
  const [startingQuick, setStartingQuick] = useState(false);
  const homeStack = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refresh = () => { setGames(listGames()); setStats(getStats()); };
    refresh();
    window.addEventListener(STATS_CHANGED, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(STATS_CHANGED, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    if (!me) return;
    const load = () => { void myOnline({ data: getCred() }).then(setOnline).catch(() => {}); };
    load();
    const i = setInterval(load, 15_000);
    return () => clearInterval(i);
  }, [me]);
  async function acceptInvite(id: string) {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosingOnline(id);
    try {
      const r = await joinGame({ data: { ...getCred(), gameId: id } });
      if (r.result === "ok") {
        report("play", "online_room_joined", id);
        await navigate({ to: "/match", search: { id: r.id } });
      } else toast.error(t("expired"));
    } catch {
      toast.error(t("error"));
    } finally {
      closingRef.current = false;
      setClosingOnline(null);
    }
  }
  async function closeOnline(id: string) {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosingOnline(id);
    try {
      const result = await cancelGame({ data: { ...getCred(), gameId: id } });
      if (!result.ok) { toast.error(t("error")); return; }
      setOnline((rows) => rows.filter((row) => row.id !== id));
      report("play", "online_game_closed", id);
    } catch (error) {
      report("error", "online_game_close_failed", error instanceof Error ? error.message : String(error));
      toast.error(t("error"));
    } finally { closingRef.current = false; setClosingOnline(null); }
  }

  const full = games.length >= MAX_SAVED;
  function toggleQuick() {
    if (quickTop === null && homeStack.current) {
      const stack = homeStack.current;
      const main = stack.parentElement;
      const mainBox = main?.getBoundingClientRect();
      const paddingTop = main ? Number.parseFloat(getComputedStyle(main).paddingTop) : 0;
      setQuickTop(Math.max(0, stack.getBoundingClientRect().top - (mainBox?.top ?? 0) - paddingTop));
    }
    setOpen(open === "ai" ? null : "ai");
  }
  async function start() {
    if (startingQuick || full) return;
    setStartingQuick(true);
    try {
      await navigate({ to: "/match", search: { id: "new", level, clock } });
    } catch {
      toast.error(t("error"));
    } finally {
      setStartingQuick(false);
    }
  }
  function remove(id: string) {
    const game = games.find((row) => row.id === id);
    deleteGame(id);
    setGames(listGames());
    if (game) report("play", "local_game_abandoned", JSON.stringify({ game: id, level: game.level, mode: game.mode }));
  }

  const winRate = stats && stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-x-hidden px-6 pt-[calc(28px+env(safe-area-inset-top))] pb-[calc(28px+env(safe-area-inset-bottom))]">
      <motion.div ref={homeStack} className="home-stack" style={{ marginTop: quickTop ?? "auto" }} initial={reducedMotion ? false : "hidden"} animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } }}>
        <motion.div variants={item} transition={{ duration: 0.45, ease: "easeOut" }} className="mb-8 space-y-1 text-center sm:mb-10">
          <motion.div className="mx-auto mb-2 size-28 drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)] sm:size-32"
            animate={reducedMotion ? false : { rotate: [0, 0, 4, -3, 0], scale: [1, 1, 1.05, 1.02, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}>
            <BrandIcon className="size-full" />
          </motion.div>
          <h1 className="brand-wordmark text-4xl sm:text-5xl">Mr B Chess</h1>
          <p className="brand-tagline">{t("tagline")}</p>
        </motion.div>

        {online.length > 0 && (
          <motion.div variants={item} className="flex flex-col gap-2">
            <p className="field-label text-center">{t("playOnline")}</p>
            {online.map((g) => <OnlineCard key={g.id} g={g} busy={closingOnline !== null} closing={closingOnline === g.id} onAccept={() => acceptInvite(g.id)} onDecline={() => void closeOnline(g.id)} />)}
          </motion.div>
        )}

        {games.length > 0 && (
          <motion.div variants={item} className="flex flex-col gap-2">
            <p className="field-label text-center">{t("ongoing")}</p>
            {games.map((g) => <GameCard key={g.id} g={g} onDelete={() => remove(g.id)} />)}
          </motion.div>
        )}

        <motion.div variants={item} transition={{ duration: 0.45, ease: "easeOut" }} className="flex flex-col gap-[7px]">
          <Button className="action-btn action-blue" onClick={toggleQuick} aria-expanded={open === "ai"} aria-controls="quick-play-setup">
            <Gamepad2 /> {t("playComputer")} <ChevronDown className="quick-chevron" data-open={open === "ai"} />
          </Button>
          <AnimatePresence initial={false}>
            {open === "ai" && (
              <Expand>
                <p className="field-label">{t("level")}</p>
                <div className="level-grid">
                  {QUICK_LEVELS.map((l) => (
                    <Button variant="ghost" key={l} className="level-btn" data-active={level === l} onClick={() => setLevel(l)}>{t(l)}</Button>
                  ))}
                </div>
                <ClockPicker value={clock} onChange={setClock} />
                <StartButton full={full} busy={startingQuick} onClick={() => void start()} />
              </Expand>
            )}
          </AnimatePresence>

          <Button variant="ghost" className="action-btn action-blue" onClick={() => void navigate({ to: "/online" })}>
            <Users /> {t("playOnline")}
          </Button>
          <Button className="action-btn action-blue" onClick={() => void navigate({ to: "/leaderboard" })}>
            <Trophy /> {t("leaderboards")}
          </Button>
        </motion.div>

        <motion.div variants={item} transition={{ duration: 0.45, ease: "easeOut" }} className="grid w-full grid-cols-3 place-items-center gap-1 pt-2">
          <Round label={t("language")} onClick={() => setLangOpen(true)}><Globe className="size-4" /></Round>
          <Round label={t("settings")} to="/settings"><Settings className="size-4" /></Round>
          <Round label={t("friends")} to="/friends"><UserPlus className="size-4" /></Round>
        </motion.div>

        {stats && (
          <motion.div variants={item} transition={{ duration: 0.45, ease: "easeOut" }} className="mt-4 flex flex-col gap-2">
            <Button variant="ghost" className="flex items-center justify-center gap-1.5" onClick={() => { if (!more) report("play", "stats_opened"); setMore(!more); }} aria-expanded={more}>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{t("stats")}</span>
              <ChevronDown className={`size-3 text-muted-foreground transition-transform ${more ? "rotate-180" : ""}`} />
            </Button>
            <div className="grid grid-cols-3 gap-2">
              <Tile icon={Gamepad2} n={stats.played} l={t("played")} />
              <Tile icon={Trophy} n={stats.wins} l={t("wins")} />
              <Tile icon={Percent} n={stats.played ? `${winRate}%` : "—"} l={t("winRate")} />
            </div>
            {more && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Tile icon={Handshake} n={stats.draws} l={t("draws")} />
                  <Tile icon={Flame} n={stats.streak} l={t("streak")} />
                </div>
                <div className="panel p-3">
                  <p className="field-label mb-2 text-center">{t("level")}</p>
                  <div className="space-y-2">{QUICK_LEVELS.map((level) => {
                    const row = stats.byLevel?.[level];
                    return <div key={level} className="grid grid-cols-[1fr_repeat(3,3rem)] items-center gap-1 text-xs"><span>{t(level)}</span><span className="text-right tabular-nums" title={t("played")}>{row?.played ?? 0}</span><span className="text-right tabular-nums" title={t("wins")}>{row?.wins ?? 0}</span><span className="text-right tabular-nums" title={t("winRate")}>{row?.played ? `${Math.round(row.wins / row.played * 100)}%` : "—"}</span></div>;
                  })}</div>
                  <div className="mt-2 grid grid-cols-[1fr_repeat(3,3rem)] gap-1 text-[9px] text-muted-foreground"><span /><span className="text-right">{t("played")}</span><span className="text-right">{t("wins")}</span><span className="text-right" title={t("winRate")} aria-label={t("winRate")}>%</span></div>
                </div>
                <div className="grid grid-cols-2 gap-2">{(["ai", "online"] as const).map((mode) => {
                  const row = stats.byMode?.[mode];
                  return <div key={mode} className="home-tile"><span className="home-tile-label">{mode === "ai" ? t("computer") : t("playOnline")}</span><span className="home-tile-num">{row?.played ?? 0}</span><span className="text-[10px] text-muted-foreground">{row?.wins ?? 0} {t("wins").toLowerCase()} · {row?.draws ?? 0} {t("draws").toLowerCase()}</span></div>;
                })}</div>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
      <LanguageSheet open={langOpen} onClose={() => setLangOpen(false)} />
    </main>
  );
}

type OnlineRow = Awaited<ReturnType<typeof myOnline>>[number];

function OnlineCard({ g, busy, closing, onAccept, onDecline }: { g: OnlineRow; busy: boolean; closing: boolean; onAccept: () => void; onDecline: () => void }) {
  const { t } = useI18n();
  const name = g.opponent ? displayName(g.opponent) : "…";
  if (g.role === "invited") return (
    <div className="game-card card-invite">
      <span className="card-chip"><PlayerAvatar avatar={g.opponent?.avatar} /></span>
      <span className="card-body"><span className="card-name">{t("invitedBy", { name })}</span>
        <span className="card-sub"><span className="card-dot" />{t("inviteValid")}</span></span>
      <Button variant="ghost" className="card-pill card-pill-action" disabled={busy} onClick={onAccept}>{t("accept")}</Button>
      <Button variant="ghost" className="card-pill" disabled={busy} onClick={onDecline}>{closing ? <Loader2 className="animate-spin" /> : t("decline")}</Button>
    </div>
  );
  if (g.role === "host") return (
    <div className="game-card card-invite">
      <Link to="/match" search={{ id: g.id }} className="card-link">
        <span className="card-chip">{g.kind === "lobby" ? <Users /> : <Send />}</span>
        <span className="card-body"><span className="card-name">{g.kind === "lobby" ? t("lobbyOpen", { code: g.code ?? "" }) : name}</span>
          <span className="card-sub"><span className="card-dot" />{g.kind === "lobby" ? `${t("waitingShort")}…` : t("waitingFor", { name })}</span></span>
      </Link>
      <Button variant="ghost" className="card-pill" disabled={busy} onClick={onDecline}>{closing ? <Loader2 className="animate-spin" /> : g.kind === "lobby" ? t("close") : t("cancel")}</Button>
    </div>
  );
  return (
    <div className={`game-card ${g.myTurn ? "card-you" : "card-opp"}`}>
      <Link to="/match" search={{ id: g.id }} className="card-link">
        <span className={`card-chip${g.myTurn ? " card-chip-light" : ""}`}><Play /></span>
        <span className="card-body"><span className="card-name">{name}</span>
          <span className="card-sub">♟ {g.moveNo}</span></span>
        <span className={g.myTurn ? "card-pill card-pill-action animate-pulse" : "card-pill"}>{g.myTurn ? t("yourTurn") : t("waitingShort")}</span>
      </Link>
      <Button variant="ghost" className="card-pill" disabled={busy} onClick={onDecline}>{closing ? <Loader2 className="animate-spin" /> : t("close")}</Button>
    </div>
  );
}

function Expand({ children }: { children: React.ReactNode }) {
  return (
    <motion.div id="quick-play-setup" className="setup-expand"
      initial={{ height: 0, opacity: 0, y: -8 }}
      animate={{ height: "auto", opacity: 1, y: 0 }}
      exit={{ height: 0, opacity: 0, y: -8 }}
      transition={{ height: { duration: 0.24, ease: "easeOut" }, opacity: { duration: 0.16 }, y: { duration: 0.22, ease: "easeOut" } }}>
      <div className="panel setup-panel">{children}</div>
    </motion.div>
  );
}

function ClockPicker({ value, onChange }: { value: number; onChange: (i: number) => void }) {
  const { t } = useI18n();
  return (
    <>
      <p className="field-label">{t("clock")}</p>
      <div className="seg">
        {CLOCKS.map((c, i) => (
          <Button variant="ghost" key={i} data-active={value === i} onClick={() => onChange(i)} className="!px-1 text-xs">
            {c ? clockLabel(c) : <InfinityIcon className="mx-auto size-4" />}
          </Button>
        ))}
      </div>
      <p className="quick-clock-description">{t(`clockDesc${value}` as "clockDesc0")}</p>
    </>
  );
}

function StartButton({ full, busy, onClick }: { full: boolean; busy: boolean; onClick: () => void }) {
  const { t } = useI18n();
  return (
    <>
      {full && <p className="text-center text-xs text-destructive">{t("maxSaved")}</p>}
      <Button variant="ghost" className="action-btn action-gold quick-start" disabled={full || busy} onClick={onClick}>{busy ? <Loader2 className="mx-auto size-5 animate-spin" /> : t("start")}</Button>
    </>
  );
}

function Tile({ icon: Icon, n, l }: { icon: typeof Trophy; n: number | string; l: string }) {
  return <div className="home-tile"><Icon className="size-3 text-primary/70" /><span className="home-tile-num">{n}</span><span className="home-tile-label">{l}</span></div>;
}

function GameCard({ g, onDelete }: { g: SavedGame; onDelete: () => void }) {
  const { t } = useI18n();
  const yours = turnOf(g.pgn) === g.human;
  return (
    <div className={`game-card ${yours ? "card-you" : "card-opp"}`}>
      <Link to="/play" search={{ id: g.id }} className="card-link">
        <span className={`card-chip${yours ? " card-chip-light" : ""}`}><Cpu /></span>
        <span className="card-body"><span className="card-name">{t("computer")} · {t(g.level)}</span>
          <span className="card-sub"><Clock className="size-2.5" />{g.clock ? clockLabel(g.clock) : t("noClock")}</span></span>
        <span className={yours ? "card-pill card-pill-action animate-pulse" : "card-pill"}>{yours ? t("yourTurn") : t("computerTurn")}</span>
      </Link>
      <Button variant="ghost" className="card-pill" onClick={onDelete}>{t("close")}</Button>
    </div>
  );
}

function Round({ label, to, onClick, children }: { label: string; to?: "/settings" | "/profile" | "/friends" | "/leaderboard"; onClick?: () => void; children: React.ReactNode }) {
  const inner = <><span className="round-btn">{children}</span><span className="round-label">{label}</span></>;
  const cls = "flex h-auto w-[70px] flex-col items-center gap-1.5 bg-transparent p-0 hover:bg-transparent hover:text-foreground active:scale-[0.92] transition-transform";
  return to ? <Link to={to} className={cls} aria-label={label}>{inner}</Link> : <Button variant="ghost" className={cls} aria-label={label} onClick={onClick}>{inner}</Button>;
}
