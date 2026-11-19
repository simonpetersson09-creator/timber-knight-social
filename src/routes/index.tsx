import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Bot, Globe, Lock, Settings, Users, UserPlus, X, Cpu, Infinity as InfinityIcon, Trophy, ChevronDown, Gamepad2, Percent, Handshake, Flame } from "lucide-react";
import { toast } from "sonner";
import { getCred } from "@/lib/identity";
import { useMe } from "@/hooks/use-me";
import { cancelGame, joinGame, myOnline } from "@/lib/online.functions";
import { Button } from "@/components/ui/button";
import { BrandIcon } from "@/components/BrandIcon";
import { PlayerAvatar } from "@/components/PlayerAvatar";

import { displayName } from "@/lib/profile";

import { LanguageSheet } from "@/components/LanguageSheet";
import { LEVELS, type Level } from "@/lib/engine";
import { useI18n } from "@/lib/i18n";
import { UNLOCK, isUnlocked } from "@/lib/progress";
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

const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

function Home() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [games, setGames] = useState<SavedGame[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [open, setOpen] = useState<"ai" | null>(null);
  const { me } = useMe();
  const [online, setOnline] = useState<OnlineRow[]>([]);
  const [level, setLevel] = useState<Level>("easy");
  const [clock, setClock] = useState(0);
  const [color, setColor] = useState<"w" | "b" | "r">("w");
  const [langOpen, setLangOpen] = useState(false);
  const [more, setMore] = useState(false);

  useEffect(() => {
    setGames(listGames());
    const s = getStats();
    setStats(s);
    setLevel([...LEVELS].reverse().find((l) => isUnlocked(l, s.levelWins)) ?? "easy");
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
  const unlocked = (l: Level) => isUnlocked(l, stats?.levelWins ?? {});

  function start(mode: "ai" | "local") {
    const human = mode === "local" ? "w" : color === "r" ? (Math.random() < 0.5 ? "w" : "b") : color;
    const g = createGame({ mode, level, human, clock: CLOCKS[clock] ?? null });
    if (g) void navigate({ to: "/play", search: { id: g.id } });
  }
  function remove(id: string) { deleteGame(id); setGames(listGames()); }

  const winRate = stats && stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  const req = UNLOCK[level];

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
                  {LEVELS.map((l) => (
                    <Button variant="ghost" key={l} className="level-btn" data-active={level === l} data-locked={!unlocked(l)} onClick={() => setLevel(l)}>
                      {!unlocked(l) && <Lock className="mr-1 inline size-3" />}{t(l)}
                    </Button>
                  ))}
                </div>
                {!unlocked(level) && req.after && (
                  <p className="text-center text-xs text-muted-foreground">
                    {t("unlockHint", { n: req.wins, level: t(req.after) })} · {stats?.levelWins[req.after] ?? 0}/{req.wins}
                  </p>
                )}
                <ClockPicker value={clock} onChange={setClock} />
                <p className="field-label">{t("yourPieces")}</p>
                <div className="seg">
                  {(["w", "b", "r"] as const).map((c) => (
                    <Button variant="ghost" key={c} data-active={color === c} onClick={() => setColor(c)}>
                      {{ w: t("wood"), b: t("black"), r: t("random") }[c]}
                    </Button>
                  ))}
                </div>
                <StartButton full={full} disabled={!unlocked(level)} onClick={() => start("ai")} />
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
  const name = g.opponent ? displayName(g.opponent) : g.kind === "lobby" ? `${t("lobby")} ${g.code ?? ""}` : "…";
  if (g.role === "invited") return (
    <div className="game-card card-invite">
      <span className="card-chip"><PlayerAvatar avatar={g.opponent?.avatar} /></span>
      <span className="min-w-0 flex-1"><span className="block truncate">{t("invitedBy", { name })}</span></span>
      <Button variant="ghost" className="icon-btn icon-ok" aria-label={t("accept")} onClick={onAccept}>✓</Button>
      <Button variant="ghost" className="card-x" aria-label={t("decline")} onClick={onDecline}><X className="size-4" /></Button>
    </div>
  );
  const cls = g.role === "host" ? "card-invite" : g.myTurn ? "card-you" : "card-opp";
  const label = g.role === "host" ? t("waitingFor", { name }) : g.myTurn ? t("yourTurn") : t("opponentTurn");
  return (
    <Link to="/match" search={{ id: g.id }} className={`game-card ${cls}`}>
      <span className="card-chip"><PlayerAvatar avatar={g.opponent?.avatar} /></span>
      <span className="min-w-0 flex-1"><span className="block truncate">{label}</span><span className="block truncate text-xs font-medium opacity-80">{name}</span></span>
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
      {value === 0 && <p className="-mt-1 text-center text-xs text-muted-foreground">{t("noClock")}</p>}
    </>
  );
}

function StartButton({ full, disabled, onClick }: { full: boolean; disabled?: boolean; onClick: () => void }) {
  const { t } = useI18n();
  return (
    <>
      {full && <p className="text-center text-xs text-destructive">{t("maxSaved")}</p>}
      <Button variant="ghost" className="action-btn action-gold" disabled={full || disabled} onClick={onClick}>{t("start")}</Button>
    </>
  );
}

function Tile({ icon: Icon, n, l }: { icon: typeof Trophy; n: number | string; l: string }) {
  return <div className="home-tile"><Icon className="size-3 text-primary/70" /><span className="home-tile-num">{n}</span><span className="home-tile-label">{l}</span></div>;
}

function GameCard({ g, onDelete }: { g: SavedGame; onDelete: () => void }) {
  const { t } = useI18n();
  const turn = turnOf(g.pgn);
  const yours = g.mode === "local" || turn === g.human;
  const label = g.mode === "ai"
    ? (yours ? t("yourTurn") : t("computerTurn"))
    : t("toMove", { side: turn === "w" ? t("wood") : t("black") });
  return (
    <div className={`game-card ${yours ? "card-you" : "card-opp"}`}>
      <Link to="/play" search={{ id: g.id }} className="flex h-full min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.98]">
        <span className="card-chip">{g.mode === "ai" ? <Cpu className="size-5" /> : <Users className="size-5" />}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate">{label}</span>
          <span className="block truncate text-xs font-medium opacity-80">
            {g.mode === "ai" ? `${t("computer")} · ${t(g.level)}` : t("twoPlayers")}{g.clock ? ` · ${clockLabel(g.clock)}` : ""}
          </span>
        </span>
      </Link>
      <Button variant="ghost" className="card-x" aria-label={t("delete")} onClick={onDelete}><X className="size-4" /></Button>
    </div>
  );
}

function Round({ label, to, onClick, children }: { label: string; to?: "/settings" | "/profile" | "/friends" | "/leaderboard"; onClick?: () => void; children: React.ReactNode }) {
  const inner = <><span className="round-btn">{children}</span><span className="round-label">{label}</span></>;
  const cls = "flex h-auto w-[70px] flex-col items-center gap-1.5 bg-transparent p-0 hover:bg-transparent hover:text-foreground active:scale-[0.92] transition-transform";
  return to ? <Link to={to} className={cls} aria-label={label}>{inner}</Link> : <Button variant="ghost" className={cls} aria-label={label} onClick={onClick}>{inner}</Button>;
}
