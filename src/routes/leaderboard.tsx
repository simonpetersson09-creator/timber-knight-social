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

type Tab = "world" | "country" | "week" | "month";
type Row = Awaited<ReturnType<typeof getLeaderboard>>[number];

function Leaderboard() {
  const { t } = useI18n();
  const { me } = useMe();
  const [tab, setTab] = useState<Tab>("world");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [stats, setStats] = useState<OnlineStats | null>(null);
  useEffect(() => { if (me) void myOnlineStats({ data: getCred() }).then(setStats).catch(() => {}); }, [me]);
  useEffect(() => {
    setRows(null);
    const kind = tab === "week" ? "week" : tab === "month" ? "month" : "year";
    const country = tab === "country" ? me?.country ?? null : null;
    if (tab === "country" && !country) { setRows([]); return; }
    void getLeaderboard({ data: { kind, country } }).then(setRows).catch(() => setRows([]));
  }, [tab, me?.country]);

  const labels: Record<Tab, string> = { world: t("world"), country: me?.country ? flagOf(me.country) : t("country"), week: t("weekTop"), month: t("monthActive") };
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 pt-[calc(20px+env(safe-area-inset-top))] pb-8">
      <PageHeader title={t("leaderboards")} />
      {stats && (
        <div className="panel p-3">
          <p className="field-label mb-2 text-center">{t("onlineStats")}</p>
          <div className="stat-grid !grid-cols-5">
            {[[stats.played, t("played")], [stats.wins, t("wins")], [stats.draws, t("draws")], [`${stats.winRate}%`, t("winRate")], [stats.streak, t("streak")]].map(([n, l]) => (
              <div key={String(l)} className="stat-cell"><div className="stat-num">{n}</div><div className="stat-label">{l}</div></div>
            ))}
          </div>
        </div>
      )}
      <div className="seg">
        {(Object.keys(labels) as Tab[]).map((k) => <button key={k} data-active={tab === k} onClick={() => setTab(k)} className="!px-1 text-xs">{labels[k]}</button>)}
      </div>
      <p className="-mt-2 text-center text-xs text-muted-foreground">{tab === "month" ? t("gamesThisMonth") : tab === "week" ? t("winsThisWeek") : t("winsThisYear")}</p>
      <div className="panel flex flex-col gap-1 p-3">
        {rows === null && <p className="py-4 text-center text-muted-foreground">…</p>}
        {rows?.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">{tab === "country" && !me?.country ? t("pickCountry") : t("noRanking")}</p>}
        {rows?.map((r, i) => (
          <div key={r.player} className="friend-row" data-me={r.player === me?.id}>
            <span className="rank-num" data-top={i < 3}>{i + 1}</span>
            <span className="friend-avatar">{r.avatar}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{displayName({ name: r.name, player_number: Number(r.player_number) })} {r.country && flagOf(r.country)}</span>
            <span className="stat-num !text-lg">{Number(r.score)}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
