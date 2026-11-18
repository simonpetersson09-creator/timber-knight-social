import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Bot, Globe, Languages, Lock, Settings, Users, UserPlus, UserRound, X, Cpu, Infinity as InfinityIcon, Trophy, Zap, Send, Hash, Mail } from "lucide-react";
import { toast } from "sonner";
import { getCred } from "@/lib/identity";
import { useMe } from "@/hooks/use-me";
import { cancelGame, createLobby, inviteFriend, joinGame, myOnline, quickMatch } from "@/lib/online.functions";
import { getFriends } from "@/lib/players.functions";
import { askPushOnFirstOnline } from "@/lib/push";
import { displayName, isOnline } from "@/lib/profile";
import { Piece } from "@/components/Piece";
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
  const [open, setOpen] = useState<"ai" | "local" | "online" | null>(null);
  const { me } = useMe();
  const [online, setOnline] = useState<OnlineRow[]>([]);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [picking, setPicking] = useState(false);
  const [level, setLevel] = useState<Level>("easy");
  const [clock, setClock] = useState(0);
  const [color, setColor] = useState<"w" | "b" | "r">("w");
  const [langOpen, setLangOpen] = useState(false);

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
  useEffect(() => { if (open === "online") { void askPushOnFirstOnline(); void getFriends({ data: getCred() }).then((r) => setFriends(r.filter((x) => x.kind === "friend"))).catch(() => {}); } }, [open]);

  async function quick() { const r = await quickMatch({ data: getCred() }); void navigate({ to: "/match", search: { id: r.id } }); }
  async function lobby() { const r = await createLobby({ data: getCred() }); void navigate({ to: "/match", search: { id: r.id } }); }
  async function invite(friend: string) { setPicking(false); const r = await inviteFriend({ data: { ...getCred(), friend } }); void navigate({ to: "/match", search: { id: r.id } }); }
  async function join() {
    const r = await joinGame({ data: { ...getCred(), code: joinCode } });
    if (r.result === "ok") void navigate({ to: "/match", search: { id: r.id } });
    else toast.error(r.result === "expired" ? t("expired") : t("notFound"));
  }
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
    <main className="flex min-h-dvh flex-col items-center px-5 pt-[calc(28px+env(safe-area-inset-top))] pb-[calc(28px+env(safe-area-inset-bottom))]">
      <motion.div className="home-stack" initial="hidden" animate="show"
        variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } }}>
        <motion.div variants={item} className="mb-2 text-center">
          <motion.div className="mx-auto mb-2 size-28 drop-shadow-2xl"
            animate={{ rotate: [0, 0, 5, -4, 0], y: [0, 0, -6, 0, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2.5 }}>
            <Piece color="w" type="k" className="size-full" />
          </motion.div>
          <h1 className="brand-wordmark text-5xl">Mr B Chess</h1>
          <p className="brand-tagline mt-2">{t("tagline")}</p>
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

        <motion.div variants={item} className="flex flex-col gap-2">
          <button className="action-btn action-blue" onClick={() => setOpen(open === "ai" ? null : "ai")}>
            <Bot className="size-5" /> {t("playComputer")}
          </button>
          <AnimatePresence initial={false}>
            {open === "ai" && (
              <Expand>
                <p className="field-label">{t("level")}</p>
                <div className="level-grid">
                  {LEVELS.map((l) => (
                    <button key={l} className="level-btn" data-active={level === l} data-locked={!unlocked(l)} onClick={() => setLevel(l)}>
                      {!unlocked(l) && <Lock className="mr-1 inline size-3" />}{t(l)}
                    </button>
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
                    <button key={c} data-active={color === c} onClick={() => setColor(c)}>
                      {{ w: t("wood"), b: t("black"), r: t("random") }[c]}
                    </button>
                  ))}
                </div>
                <StartButton full={full} disabled={!unlocked(level)} onClick={() => start("ai")} />
              </Expand>
            )}
          </AnimatePresence>

          <button className="action-btn action-blue" onClick={() => setOpen(open === "local" ? null : "local")}>
            <Users className="size-5" /> {t("twoPlayers")}
          </button>
          <AnimatePresence initial={false}>
            {open === "local" && (
              <Expand>
                <ClockPicker value={clock} onChange={setClock} />
                <StartButton full={full} onClick={() => start("local")} />
              </Expand>
            )}
          </AnimatePresence>

          <button className="action-btn action-blue" onClick={() => setOpen(open === "online" ? null : "online")}>
            <Globe className="size-5" /> {t("playOnline")}
          </button>
          <AnimatePresence initial={false}>
            {open === "online" && (
              <Expand>
                <button className="action-btn action-gold" disabled={!me} onClick={quick}><Zap className="size-5" /> {t("quickMatch")}</button>
                <button className="action-btn action-ghost" disabled={!me} onClick={() => setPicking(!picking)}><Send className="size-5" /> {t("inviteFriend")}</button>
                {picking && (
                  <div className="flex flex-col gap-1">
                    {friends.length === 0 && <Link to="/friends" className="text-center text-sm underline">{t("noFriends")}</Link>}
                    {friends.map((f) => (
                      <button key={f.id} className="friend-row text-left" onClick={() => invite(f.player.id)}>
                        <span className="friend-avatar">{f.player.avatar}<span className="status-dot" data-on={isOnline(f.player.last_seen)} /></span>
                        <span className="flex-1 truncate font-semibold">{displayName(f.player)}</span>
                        <Mail className="size-4" />
                      </button>
                    ))}
                  </div>
                )}
                <button className="action-btn action-ghost" disabled={!me} onClick={lobby}><Hash className="size-5" /> {t("createLobby")}</button>
                <div className="flex gap-2">
                  <input className="text-field flex-1 uppercase tracking-[0.3em]" maxLength={6} value={joinCode} placeholder={t("lobbyCode")}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} />
                  <button className="action-btn action-gold !w-auto px-5" disabled={joinCode.length !== 6 || !me} onClick={join}>{t("join")}</button>
                </div>
              </Expand>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div variants={item} className="my-2 flex justify-center gap-4">
          <button className="round-btn" aria-label={t("language")} onClick={() => setLangOpen(true)}><Languages className="size-5" /></button>
          <Link to="/settings" className="round-btn" aria-label={t("settings")}><Settings className="size-5" /></Link>
          <Link to="/profile" className="round-btn" aria-label={t("profile")}><UserRound className="size-5" /></Link>
          <Link to="/friends" className="round-btn" aria-label={t("friends")}><UserPlus className="size-5" /></Link>
          <Link to="/leaderboard" className="round-btn" aria-label={t("leaderboards")}><Trophy className="size-5" /></Link>
        </motion.div>

        {stats && (
          <motion.div variants={item} className="panel p-3">
            <p className="field-label mb-2 text-center">{t("stats")}</p>
            <div className="stat-grid">
              <Stat n={stats.played} l={t("played")} />
              <Stat n={stats.wins} l={t("wins")} />
              <Stat n={stats.draws} l={t("draws")} />
              <Stat n={`${winRate}%`} l={t("winRate")} />
              <Stat n={stats.streak} l={t("streak")} />
            </div>
          </motion.div>
        )}
      </motion.div>
      <LanguageSheet open={langOpen} onClose={() => setLangOpen(false)} />
    </main>
  );
}

type OnlineRow = Awaited<ReturnType<typeof myOnline>>[number];
type FriendRow = Awaited<ReturnType<typeof getFriends>>[number];

function OnlineCard({ g, onAccept, onDecline }: { g: OnlineRow; onAccept: () => void; onDecline: () => void }) {
  const { t } = useI18n();
  const name = g.opponent ? displayName(g.opponent) : g.kind === "lobby" ? `${t("lobby")} ${g.code ?? ""}` : "…";
  if (g.role === "invited") return (
    <div className="game-card card-invite">
      <span className="card-chip">{g.opponent?.avatar ?? "♞"}</span>
      <span className="min-w-0 flex-1"><span className="block truncate">{t("invitedBy", { name })}</span></span>
      <button className="icon-btn icon-ok" aria-label={t("accept")} onClick={onAccept}>✓</button>
      <button className="card-x" aria-label={t("decline")} onClick={onDecline}><X className="size-4" /></button>
    </div>
  );
  const cls = g.role === "host" ? "card-invite" : g.myTurn ? "card-you" : "card-opp";
  const label = g.role === "host" ? t("waitingFor", { name }) : g.myTurn ? t("yourTurn") : t("opponentTurn");
  return (
    <Link to="/match" search={{ id: g.id }} className={`game-card ${cls}`}>
      <span className="card-chip">{g.opponent?.avatar ?? "♞"}</span>
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
          <button key={i} data-active={value === i} onClick={() => onChange(i)} className="!px-1 text-xs">
            {c ? clockLabel(c) : <InfinityIcon className="mx-auto size-4" />}
          </button>
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
      <button className="action-btn action-gold" disabled={full || disabled} onClick={onClick}>{t("start")}</button>
    </>
  );
}

function Stat({ n, l }: { n: number | string; l: string }) {
  return <div className="stat-cell"><div className="stat-num">{n}</div><div className="stat-label">{l}</div></div>;
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
      <button className="card-x" aria-label={t("delete")} onClick={onDelete}><X className="size-4" /></button>
    </div>
  );
}
