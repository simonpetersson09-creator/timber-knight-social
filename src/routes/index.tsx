import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Bot, Globe, Settings, Users, UserPlus, X, Cpu, Infinity as InfinityIcon, Trophy, ChevronDown, Gamepad2, Percent, Handshake, Flame, Play, Send, Clock } from "lucide-react";
import { toast } from "sonner";
import { getCred } from "@/lib/identity";
import { useMe } from "@/hooks/use-me";
import { cancelGame, joinGame, myOnline } from "@/lib/online.functions";
import { Button } from "@/components/ui/button";
import { BrandIcon } from "@/components/BrandIcon";
import { PlayerAvatar } from "@/components/PlayerAvatar";

import { displayName } from "@/lib/profile";

import { LanguageSheet } from "@/components/LanguageSheet";
import { type Level } from "@/lib/engine";
import { useI18n } from "@/lib/i18n";
import {
  CLOCKS, MAX_SAVED, clockLabel, createGame, deleteGame, getStats, listGames, turnOf,
  type SavedGame, type Stats,
} from "@/lib/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mr B Chess – Schack i trä" },
      { name: "description", content: "Spela schack på ett vackert träbräde mot datorn eller mot en vän." },
      { property: "og:title", content: "Mr B Chess – Schack i trä" },
      { property: "og:description", content: "Spela schack på ett vackert träbräde mot datorn eller mot en vän." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const QUICK_LEVELS = ["beginner", "medium", "hard"] as const satisfies readonly Level[];

const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

function Home() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [games, setGames] = useState<SavedGame[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [open, setOpen] = useState<"ai" | null>(null);
  const { me } = useMe();
  const [online, setOnline] = useState<OnlineRow[]>([]);
  const [level, setLevel] = useState<Level>("beginner");
  const [clock, setClock] = useState(0);
  const [langOpen, setLangOpen] = useState(false);
  const [more, setMore] = useState(false);

  useEffect(() => {
    setGames(listGames());
    const s = getStats();
    setStats(s);
  }, []);

  useEffect(() => {
    if (!me) return;
    const load = () => { void myOnline({ data: getCred() }).then(setOnline).catch(() => {}); };
    load();
    const i = setInterval(load, 15_000);
    return () => clearInterval(i);
  }, [me]);
  async function acceptInvite(id: string) {
    const r = await joinGame({ data: { ...getCred(), gameId: id } });
    if (r.result === "ok") void navigate({ to: "/match", search: { id: r.id } }); else toast.error(t("expired"));
  }
  async function decline(id: string) { await cancelGame({ data: { ...getCred(), gameId: id } }); setOnline((o) => o.filter((x) => x.id !== id)); }

  const full = games.length >= MAX_SAVED;
  function start() {
    // The player always gets the ivory pieces and moves first.
    const g = createGame({ mode: "ai", level, human: "w", clock: CLOCKS[clock] ?? null });
    if (g) void navigate({ to: "/play", search: { id: g.id } });
  }
  function remove(id: string) { deleteGame(id); setGames(listGames()); }

  const winRate = stats && stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-x-hidden px-6 pt-[calc(28px+env(safe-area-inset-top))] pb-[calc(28px+env(safe-area-inset-bottom))]">
      <div className="home-glow" aria-hidden />
      <div className="home-pattern" aria-hidden />
      <motion.div className="home-stack" initial="hidden" animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } }}>
        <motion.div variants={item} transition={{ duration: 0.45, ease: "easeOut" }} className="mb-8 space-y-1 text-center sm:mb-10">
          <motion.div className="mx-auto mb-2 size-28 drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)] sm:size-32"
            animate={{ rotate: [0, 0, 4, -3, 0], scale: [1, 1, 1.05, 1.02, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}>
            <BrandIcon className="size-full" />
          </motion.div>
          <h1 className="brand-wordmark text-4xl sm:text-5xl">Mr B Chess</h1>
          <p className="brand-tagline">{t("tagline")}</p>
        </motion.div>

        {online.length > 0 && (
          <motion.div variants={item} className="flex flex-col gap-2">
            <p className="field-label text-center">{t("playOnline")}</p>
            {online.map((g) => <OnlineCard key={g.id} g={g} onAccept={() => acceptInvite(g.id)} onDecline={() => decline(g.id)} />)}
          </motion.div>
        )}

        {games.length > 0 && (
          <motion.div variants={item} className="flex flex-col gap-2">
            <p className="field-label text-center">{t("ongoing")}</p>
            {games.map((g) => <GameCard key={g.id} g={g} onDelete={() => remove(g.id)} />)}
          </motion.div>
        )}

        <motion.div variants={item} transition={{ duration: 0.45, ease: "easeOut" }} className="flex flex-col gap-[7px]">
          <Button className="action-btn action-blue" onClick={() => setOpen(open === "ai" ? null : "ai")}>
            <Bot /> {t("playComputer")}
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
                <p className="text-center text-xs text-muted-foreground">{t("youGetMahogany")}</p>
                <StartButton full={full} onClick={start} />
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
            <Button variant="ghost" className="flex items-center justify-center gap-1.5" onClick={() => setMore(!more)} aria-expanded={more}>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{t("stats")}</span>
              <ChevronDown className={`size-3 text-muted-foreground transition-transform ${more ? "rotate-180" : ""}`} />
            </Button>
            <div className="grid grid-cols-3 gap-2">
              <Tile icon={Gamepad2} n={stats.played} l={t("played")} />
              <Tile icon={Trophy} n={stats.wins} l={t("wins")} />
              <Tile icon={Percent} n={stats.played ? `${winRate}%` : "—"} l={t("winRate")} />
            </div>
            {more && (
              <div className="grid grid-cols-2 gap-2">
                <Tile icon={Handshake} n={stats.draws} l={t("draws")} />
                <Tile icon={Flame} n={stats.streak} l={t("streak")} />
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

function OnlineCard({ g, onAccept, onDecline }: { g: OnlineRow; onAccept: () => void; onDecline: () => void }) {
  const { t } = useI18n();
  const name = g.opponent ? displayName(g.opponent) : "…";
  if (g.role === "invited") return (
    <div className="game-card card-invite">
      <span className="card-chip"><PlayerAvatar avatar={g.opponent?.avatar} /></span>
      <span className="card-body"><span className="card-name">{t("invitedBy", { name })}</span>
        <span className="card-sub"><span className="card-dot" />{t("inviteValid")}</span></span>
      <Button variant="ghost" className="card-pill card-pill-action" onClick={onAccept}>{t("accept")}</Button>
      <Button variant="ghost" className="card-pill" aria-label={t("decline")} onClick={onDecline}><X /></Button>
    </div>
  );
  if (g.role === "host") return (
    <div className="game-card card-invite">
      <Link to="/match" search={{ id: g.id }} className="card-link">
        <span className="card-chip">{g.kind === "lobby" ? <Users /> : <Send />}</span>
        <span className="card-body"><span className="card-name">{g.kind === "lobby" ? t("lobbyOpen", { code: g.code ?? "" }) : name}</span>
          <span className="card-sub"><span className="card-dot" />{g.kind === "lobby" ? `${t("waitingShort")}…` : t("waitingFor", { name })}</span></span>
      </Link>
      <Button variant="ghost" className="card-pill" onClick={onDecline}>{g.kind === "lobby" ? t("close") : t("cancel")}</Button>
    </div>
  );
  return (
    <Link to="/match" search={{ id: g.id }} className={`game-card ${g.myTurn ? "card-you" : "card-opp"}`}>
      <span className={`card-chip${g.myTurn ? " card-chip-light" : ""}`}><Play /></span>
      <span className="card-body"><span className="card-name">{name}</span>
        <span className="card-sub">♟ {g.moveNo}</span></span>
      <span className={g.myTurn ? "card-pill card-pill-action animate-pulse" : "card-pill"}>{g.myTurn ? t("yourTurn") : t("waitingShort")}</span>
    </Link>
  );
}

function Expand({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
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
      <p className="-mt-1 text-center text-xs text-muted-foreground">{t(`clockDesc${value}` as "clockDesc0")}</p>
    </>
  );
}

function StartButton({ full, onClick }: { full: boolean; onClick: () => void }) {
  const { t } = useI18n();
  return (
    <>
      {full && <p className="text-center text-xs text-destructive">{t("maxSaved")}</p>}
      <Button variant="ghost" className="action-btn action-gold" disabled={full} onClick={onClick}>{t("start")}</Button>
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
      <Button variant="ghost" className="card-pill" aria-label={t("delete")} onClick={onDelete}><X /></Button>
    </div>
  );
}

function Round({ label, to, onClick, children }: { label: string; to?: "/settings" | "/profile" | "/friends" | "/leaderboard"; onClick?: () => void; children: React.ReactNode }) {
  const inner = <><span className="round-btn">{children}</span><span className="round-label">{label}</span></>;
  const cls = "flex h-auto w-[70px] flex-col items-center gap-1.5 bg-transparent p-0 hover:bg-transparent hover:text-foreground active:scale-[0.92] transition-transform";
  return to ? <Link to={to} className={cls} aria-label={label}>{inner}</Link> : <Button variant="ghost" className={cls} aria-label={label} onClick={onClick}>{inner}</Button>;
}
