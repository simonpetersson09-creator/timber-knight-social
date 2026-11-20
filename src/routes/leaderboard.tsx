import { PlayerAvatar } from "@/components/PlayerAvatar";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useMe } from "@/hooks/use-me";
import { useI18n } from "@/lib/i18n";
import { getCred } from "@/lib/identity";
import { getLeaderboard, myOnlineStats } from "@/lib/online.functions";
import { displayName, flagOf } from "@/lib/profile";
import type { OnlineStats } from "@/lib/online-rules";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Topplistor – Mr B Chess" },
      { name: "description", content: "Världens och ditt lands bästa schackspelare, veckans topp 10 och månadens flitigaste." },
      { property: "og:title", content: "Topplistor – Mr B Chess" },
      { property: "og:description", content: "Världens och ditt lands bästa schackspelare, veckans topp 10 och månadens flitigaste." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Leaderboard,
});

type Row = Awaited<ReturnType<typeof getLeaderboard>>[number];
type Lists = { world: Row[]; country: Row[]; week: Row[]; month: Row[] };
const CACHE = "mrbchess.leaderboard.v1";
function cached<T>(k: string): T | null {
  try { const v = sessionStorage.getItem(`${CACHE}.${k}`); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function store(k: string, v: unknown) { try { sessionStorage.setItem(`${CACHE}.${k}`, JSON.stringify(v)); } catch { /* ignore */ } }

function Leaderboard() {
  const { t } = useI18n();
  const { me } = useMe();
  const [lists, setLists] = useState<Lists | null>(null);
  const [stats, setStats] = useState<OnlineStats | null>(null);
  useEffect(() => { setLists(cached<Lists>("lists")); setStats(cached<OnlineStats>("stats")); }, []);
  useEffect(() => { if (me) void myOnlineStats({ data: getCred() }).then((v) => { setStats(v); store("stats", v); }).catch(() => {}); }, [me]);
  useEffect(() => {
    const country = me?.country ?? null;
    const get = (kind: "year" | "week" | "month", c: string | null) => getLeaderboard({ data: { kind, country: c } }).catch(() => [] as Row[]);
    void Promise.all([get("year", null), country ? get("year", country) : Promise.resolve([] as Row[]), get("week", null), get("month", null)])
      .then(([world, c, week, month]) => { const v = { world, country: c, week, month }; setLists(v); store("lists", v); });
  }, [me?.country]);

  const statRows: [string, string | number][] = stats
    ? [[t("played"), stats.played], [t("wins"), stats.wins], [t("draws"), stats.draws], [t("winRate"), `${stats.winRate}%`], [t("streak"), stats.streak]]
    : [];
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 pt-[calc(20px+env(safe-area-inset-top))] pb-[calc(32px+env(safe-area-inset-bottom))]">
      <PageHeader title={t("leaderboards")} />
      <section className="flex flex-col gap-2">
        <p className="lb-section-title">{t("onlineStats")}</p>
        <div className="lb-card">
          {(statRows.length ? statRows : [[t("played"), "…"]] as [string, string][]).map(([l, n]) => (
            <div key={l} className="lb-row"><span className="lb-label">{l}</span><span className="lb-value">{n}</span></div>
          ))}
        </div>
      </section>
      <Board title={t("world")} sub={t("winsThisYear")} rows={lists?.world} me={me?.id} empty={t("noRanking")} />
      <Board title={me?.country ? `${flagOf(me.country)} ${t("country")}` : t("country")} sub={t("winsThisYear")} rows={me?.country ? lists?.country : []} me={me?.id} empty={me?.country ? t("noRanking") : t("pickCountry")} />
      <Board title={t("weekTop")} sub={t("winsThisWeek")} rows={lists?.week} me={me?.id} empty={t("noRanking")} />
      <Board title={t("monthActive")} sub={t("gamesThisMonth")} rows={lists?.month} me={me?.id} empty={t("noRanking")} />
    </main>
  );
}

function Board({ title, sub, rows, me, empty }: { title: string; sub: string; rows: Row[] | undefined; me: string | undefined; empty: string }) {
  return (
    <section className="flex flex-col gap-1">
      <p className="lb-section-title">{title}</p>
      <p className="lb-sub">{sub}</p>
      <div className="lb-card">
        {rows === undefined && <div className="lb-row"><span className="lb-label">…</span></div>}
        {rows?.length === 0 && <div className="lb-row"><span className="text-xs text-muted-foreground">{empty}</span></div>}
        {rows?.map((r, i) => (
          <div key={r.player} className="lb-row" data-me={r.player === me}>
            <span className="lb-rank" data-top={i < 3}>{i + 1}</span>
            <span className="lb-avatar friend-avatar"><PlayerAvatar avatar={r.avatar} /></span>
            <span className="lb-name">{displayName({ name: r.name, player_number: Number(r.player_number) })} {r.country && flagOf(r.country)}</span>
            <span className="lb-value">{Number(r.score)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
