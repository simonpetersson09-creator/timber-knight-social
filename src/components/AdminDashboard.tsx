import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, BellRing, ChartLine, ChevronLeft, ChevronRight, Copy, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminLineChart from "@/components/AdminLineChart";
import { adminPushTest, adminSetTest, adminStats } from "@/lib/admin.functions";
import {
  adminForfeitShare, adminOnlineOutcomes, adminRecordIndexes, adminReturningShare,
  adminRollingMean, buildRibbon, type AdminColumnKey, type AdminDayRow, type StarPoint,
} from "@/lib/admin-records";

const ADMIN_KEY_STORAGE = "lovable.admin.key";
const COLUMNS: { key: AdminColumnKey; label: string }[] = [
  { key: "devices", label: "Aktiva enheter" },
  { key: "played", label: "Enheter som spelade" },
  { key: "returning_played", label: "Spelade även igår (antal / andel)" },
  { key: "new_players", label: "Nya appenheter" },
  { key: "ios", label: "iPhone / Android" },
  { key: "avg_app_age_days", label: "Medelappålder (dagar)" },
  { key: "total", label: "Färdiga partier totalt" },
  { key: "cpu_finished", label: "Mot datorn" },
  { key: "online_finished", label: "Online (inkl. Snabbmatch)" },
  { key: "forfeits", label: "Avhopp online" },
  { key: "issues", label: "Problemhändelser" },
  { key: "post_match_shown", label: "Partiannonser visade / tillfällen" },
];
const WORST_COLUMNS: AdminColumnKey[] = ["forfeits", "issues"];
const WEEKDAYS = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"];
const fmtDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
type Stats = Awaited<ReturnType<typeof adminStats>>;

export default function AdminDashboard({ diagram = false }: { diagram?: boolean }) {
  const [adminKey, setAdminKey] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsedColumns, setCollapsedColumns] = useState<AdminColumnKey[]>([]);
  const [num, setNum] = useState("");
  const [copied, setCopied] = useState(false);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [pushMessage, setPushMessage] = useState("");
  const rows = stats?.days ?? null;
  const chartRows = stats?.periodStats.days ?? null;
  const records = useMemo(() => adminRecordIndexes(rows ?? [], COLUMNS.map((c) => c.key)), [rows]);
  const means = useMemo(() => Object.fromEntries((rows ?? []).map((row) => [row.day,
    Object.fromEntries([...COLUMNS.map((column) => column.key), "android" as const, "issue_devices" as const, "post_match_opportunities" as const].map((key) => [key, adminRollingMean(rows ?? [], row.day, key)])),
  ])), [rows]);
  const meanText = (day: string, key: AdminColumnKey) => {
    const value = means[day]?.[key];
    return value == null ? "—" : Number(value).toLocaleString("sv-SE", { maximumFractionDigits: 1 });
  };
  const wrapRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ gold: StarPoint[]; red: StarPoint[]; w: number; h: number }>({ gold: [], red: [], w: 0, h: 0 });

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || diagram) return;
    const table = wrap.querySelector("table");
    if (!table) return;
    const order = COLUMNS.map((c) => c.key);
    const measure = () => {
      const box = wrap.getBoundingClientRect();
      const stars = Array.from(wrap.querySelectorAll<HTMLElement>("[data-star]")).map((el) => {
        const b = el.getBoundingClientRect(), row = el.closest("tr"), rb = row ? row.getBoundingClientRect() : b;
        return { key: el.dataset["star"] as AdminColumnKey, day: el.dataset["day"] ?? "",
          x: b.left - box.left - wrap.clientLeft + wrap.scrollLeft + b.width / 2,
          y: b.top - box.top - wrap.clientTop + wrap.scrollTop + b.height / 2,
          lane: rb.top - box.top - wrap.clientTop + wrap.scrollTop + 3 };
      });
      const byColumn = (a: StarPoint, b: StarPoint) => order.indexOf(a.key) - order.indexOf(b.key);
      setLines({ gold: stars.filter((s) => !WORST_COLUMNS.includes(s.key)).sort(byColumn), red: stars.filter((s) => WORST_COLUMNS.includes(s.key)).sort(byColumn), w: table.offsetWidth, h: table.offsetHeight });
    };
    measure();
    const raf = requestAnimationFrame(measure);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(table);
    window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); cancelAnimationFrame(raf); window.removeEventListener("resize", measure); };
  }, [rows, diagram, collapsedColumns]);

  const load = async (key: string, selectedPeriod: 7 | 30 | 90 = period) => {
    setLoading(true); setError(null);
    try {
      const result = await adminStats({ data: { password: key, days: selectedPeriod } });
      setStats(result);
      try { localStorage.setItem(ADMIN_KEY_STORAGE, key); } catch { /* storage unavailable */ }
    } catch {
      try { localStorage.removeItem(ADMIN_KEY_STORAGE); } catch { /* storage unavailable */ }
      setAdminKey(""); setStats(null);
      setError("Lösenordet godkändes inte, eller admin kunde inte öppnas. Försök igen.");
    } finally { setLoading(false); }
  };
  useEffect(() => {
    let key = "";
    try { key = localStorage.getItem(ADMIN_KEY_STORAGE) ?? ""; } catch { /* storage unavailable */ }
    if (key) { setAdminKey(key); void load(key); } else setLoading(false);
    // Initial remembered-key login only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!stats) {
    if (loading) return <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground" role="status"><RefreshCw className="mr-2 h-5 w-5 motion-safe:animate-spin" />Öppnar admin…</div>;
    return <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground"><form className="w-full max-w-sm space-y-3" onSubmit={(e) => { e.preventDefault(); void load(adminKey); }}>
      <h1 className="text-xl font-semibold">Admin</h1>
      <input name="admin-password" autoComplete="current-password" aria-label="Adminnyckel" type="password" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} placeholder="Adminnyckel" className="w-full rounded-md border border-border bg-card px-3 py-2" />
      <Button type="submit" disabled={loading || !adminKey} className="w-full">{loading ? "Laddar…" : "Logga in"}</Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form></div>;
  }

  const sum = (key: AdminColumnKey): number => rows!.reduce((total, row) => total + (key === "total" ? row.cpu_finished + row.online_finished : Number(row[key] ?? 0)), 0);
  const diagnostics = stats.diagnostics.map((row) => JSON.stringify(row)).join("\n");
  const best = stats.periodStats.best;
  const retentionCards = [["D1", stats.retention.d1], ["D7", stats.retention.d7], ["D30", stats.retention.d30]] as const;
  return <div className="max-h-screen min-h-screen overflow-y-auto overscroll-contain bg-background p-4 text-foreground md:p-8">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-4"><div>
      <h1 className="text-xl font-semibold">{diagram ? `Linjediagram – senaste ${period} dagarna` : "Senaste 30 dagarna, per dag"}</h1>
      <p className="text-sm text-muted-foreground">Svensk tid, bara appen (iPhone/Android). Dagens rad är inte komplett. Parentes: dagsmedel för upp till 30 dagar.</p>
    </div><div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm"><Link to={diagram ? "/admin" : "/admin/diagram"}>{diagram ? <ArrowLeft /> : <ChartLine />}{diagram ? "Till tabellen" : "Diagram"}</Link></Button>
      <Button variant="outline" size="sm" onClick={() => void load(adminKey)} disabled={loading}><RefreshCw />{loading ? "Uppdaterar…" : "Uppdatera"}</Button>
      <Button variant="outline" size="sm" disabled={loading} onClick={() => { try { localStorage.removeItem(ADMIN_KEY_STORAGE); } catch { /* storage unavailable */ } setAdminKey(""); setStats(null); setError(null); }}><LogOut />Logga ut</Button>
    </div></div>
    {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
    <section aria-label="Periodanalys" className="mb-5 grid gap-3 lg:grid-cols-[auto_1fr_1fr]">
      <div className="rounded-lg border border-border bg-card p-3"><label className="text-xs text-muted-foreground" htmlFor="admin-period">Analysera period</label><select id="admin-period" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={period} disabled={loading} onChange={(event) => { const next = Number(event.target.value) as 7 | 30 | 90; setPeriod(next); void load(adminKey, next); }}><option value={7}>7 dagar</option><option value={30}>30 dagar</option><option value={90}>90 dagar</option></select><p className="mt-1 text-xs text-muted-foreground">30-dagarstabellen finns alltid kvar.</p></div>
      <div className="rounded-lg border border-border bg-card p-3"><p className="mb-2 text-xs text-muted-foreground">Återkommande appenheter · mogna kohorter</p><div className="grid grid-cols-3 gap-2">{retentionCards.map(([label, value]) => <div key={label}><p className="font-semibold">{label}: {value.rate == null ? "—" : `${value.rate.toLocaleString("sv-SE", { maximumFractionDigits: 1 })} %`}</p><p className="text-xs text-muted-foreground">{value.returned} av {value.eligible}</p></div>)}</div></div>
      <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Onlineläge just nu</p><div className="mt-1 flex gap-5"><p><b className="text-xl">{stats.liveGames.active}</b><span className="ml-1 text-sm">pågående</span></p><p><b className="text-xl">{stats.liveGames.waiting}</b><span className="ml-1 text-sm">väntande</span></p></div><p className="mt-1 text-xs text-muted-foreground">{stats.liveGames.byKind.map(([key, count]) => `${key.replace(":", " · ")}: ${count}`).join(" · ") || "Inga aktiva eller väntande matcher"}</p></div>
    </section>
    {diagram ? <div className="flex flex-col items-start gap-5 lg:flex-row">
      <section aria-label="Bästa tider" className="flex shrink-0 gap-3 lg:w-56 lg:flex-col">
        <div className="flex-1 rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Bästa veckodag</p><p className="text-lg font-semibold capitalize">{best.weekday ? WEEKDAYS[best.weekday.dow] : "—"}</p>{best.weekday && <p className="text-xs text-muted-foreground">i snitt {best.weekday.avg_devices.toLocaleString("sv-SE", { maximumFractionDigits: 1 })} spelande enheter/dag</p>}</div>
        <div className="flex-1 rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Bästa timme</p><p className="text-lg font-semibold tabular-nums">{best.hour ? `${String(best.hour.hour).padStart(2, "0")}–${String((best.hour.hour + 1) % 24).padStart(2, "0")}` : "—"}</p>{best.hour && <p className="text-xs text-muted-foreground">{best.hour.devices} unika spelande enheter</p>}</div>
      </section><div className="w-full min-w-0 flex-1"><AdminLineChart rows={chartRows!} /></div>
    </div> : <>
      <div ref={wrapRef} className="relative overflow-x-auto rounded-lg border border-border"><svg className="pointer-events-none absolute left-0 top-0 z-0" width={lines.w} height={lines.h} aria-hidden="true">
        <path d={buildRibbon(lines.gold)} fill="none" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--primary)" }} /><path d={buildRibbon(lines.red)} fill="none" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--destructive)" }} />
        {lines.gold.map((p, i) => <circle key={`g${i}`} cx={p.x} cy={p.y} r={2.5} style={{ fill: "var(--primary)" }} />)}{lines.red.map((p, i) => <circle key={`r${i}`} cx={p.x} cy={p.y} r={2.5} style={{ fill: "var(--destructive)" }} />)}
      </svg><table className="relative z-10 w-full text-sm"><thead className="bg-card"><tr><th className="px-2 py-1.5 text-left align-bottom font-medium">Datum</th>{COLUMNS.map((c) => <th key={c.key} className={`${collapsedColumns.includes(c.key) ? "px-1" : "px-2"} max-w-[7.5rem] py-1.5 align-bottom font-medium leading-tight`}><span className="flex items-end justify-end gap-0.5 text-right">{collapsedColumns.includes(c.key) ? (c.key === "devices" ? "Aktiva" : "iOS/Android") : c.label}{(c.key === "devices" || c.key === "ios") && <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 self-center" aria-label={`${collapsedColumns.includes(c.key) ? "Fäll ut" : "Minimera"} ${c.label}`} aria-expanded={!collapsedColumns.includes(c.key)} onClick={() => setCollapsedColumns((keys) => keys.includes(c.key) ? keys.filter((key) => key !== c.key) : [...keys, c.key])}>{collapsedColumns.includes(c.key) ? <ChevronRight /> : <ChevronLeft />}</Button>}</span></th>)}</tr></thead>
        <tbody>{rows!.map((r, i) => <tr key={r.day} className="border-t border-border"><td className="whitespace-nowrap px-2 py-1">{fmtDay(r.day)}</td>{COLUMNS.map((c) => <td key={c.key} className={`${collapsedColumns.includes(c.key) ? "px-1" : "px-2"} whitespace-nowrap py-1`}>{!collapsedColumns.includes(c.key) && <span className="flex items-baseline justify-end gap-1 tabular-nums"><span className="text-right">{c.key === "ios" ? <>{r.ios} <span className="text-muted-foreground">({meanText(r.day, "ios")})</span> / {r.android} <span className="text-muted-foreground">({meanText(r.day, "android")})</span></> : <>{c.key === "avg_app_age_days" ? r.avg_app_age_days == null ? "—" : Number(r.avg_app_age_days).toLocaleString("sv-SE", { maximumFractionDigits: 0 }) : c.key === "total" ? r.cpu_finished + r.online_finished : r[c.key] ?? "—"} <span className="text-muted-foreground">({meanText(r.day, c.key)})</span>{c.key === "issues" && <><br /><span className="text-muted-foreground">{r.issue_devices ?? "—"} enheter ({meanText(r.day, "issue_devices")})</span></>}{c.key === "returning_played" && <><br /><span className="text-muted-foreground">{adminReturningShare(r)?.toLocaleString("sv-SE", { maximumFractionDigits: 1 }) ?? "—"} % av {r.played}</span></>}{c.key === "post_match_shown" && <> / {r.post_match_opportunities ?? "—"} <span className="text-muted-foreground">({meanText(r.day, "post_match_opportunities")})</span></>}{c.key === "forfeits" && <><br /><span className="text-muted-foreground">av {adminOnlineOutcomes(r)} · {adminForfeitShare(r)?.toLocaleString("sv-SE", { maximumFractionDigits: 1 }) ?? "—"} %</span></>}</>}</span><span className="flex h-5 w-7 items-center justify-center" aria-hidden="true">{records[c.key] === i && <span data-star={c.key} data-day={r.day} title={WORST_COLUMNS.includes(c.key) ? "Flest i perioden" : "Rekord i perioden"} className={`inline-block scale-150 text-xl leading-none ${WORST_COLUMNS.includes(c.key) ? "text-destructive" : "text-primary"}`}>★</span>}</span></span>}</td>)}</tr>)}</tbody>
        <tfoot className="bg-card font-medium"><tr className="border-t border-border"><td className="px-3 py-2">Summa</td>{COLUMNS.map((c) => <td key={c.key} className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{["devices", "ios", "played", "returning_played", "avg_app_age_days"].includes(c.key) ? "—" : c.key === "post_match_shown" ? `${sum(c.key)} / ${sum("post_match_opportunities")}` : c.key === "forfeits" ? `${sum(c.key)} av ${rows!.reduce((n, r) => n + adminOnlineOutcomes(r), 0)}` : sum(c.key)}</td>)}</tr></tfoot>
      </table></div>
      <p className="mt-3 text-xs text-muted-foreground">Appålder bygger på första registrerade appaktivitet, inte verifierad nedladdningsdag. Nya appenheter är nya enhets-ID:n, inte verifierade nya personer. Partiannonser är bekräftade visningar / registrerade tillfällen. Avhoppsandel är avhopp / (färdiga onlinematcher + avhopp).</p>
      <p className="mt-3 text-xs text-muted-foreground">★ = högsta värdet i kolumnen under perioden. För avhopp och problem är röd stjärna den sämsta dagen. Enhetssummor visas inte eftersom samma enhet kan spela flera dagar.</p>
      <details className="mt-6 border-t border-border pt-4"><summary className="cursor-pointer font-semibold">Testenheter och loggdetaljer</summary>
        <div className="mt-4 grid gap-5 lg:grid-cols-2"><section><h2 className="mb-2 font-semibold">Testtelefoner</h2><p className="text-sm text-muted-foreground">Spelarnummer syns i appens inställningar. Nu: {stats.testPlayers.join(", ") || "inga"}</p><div className="mt-2 flex flex-wrap gap-2"><input className="text-field max-w-40" inputMode="numeric" aria-label="Spelarnummer" value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, ""))} placeholder="Spelarnummer" /><Button size="sm" disabled={!num} onClick={async () => { await adminSetTest({ data: { password: adminKey, playerNumber: Number(num), isTest: true } }); setNum(""); await load(adminKey); }}>Lägg till</Button><Button size="sm" variant="outline" disabled={!num} onClick={async () => { await adminSetTest({ data: { password: adminKey, playerNumber: Number(num), isTest: false } }); setNum(""); await load(adminKey); }}>Ta bort</Button><Button size="sm" variant="outline" disabled={!num} onClick={async () => { const response = await adminPushTest({ data: { password: adminKey, playerNumber: Number(num) } }); setPushMessage({ sent: "Testnotisen skickades.", missing_token: "Enheten har ingen registrerad notismottagare.", not_configured: "Notisleveransen är inte konfigurerad ännu.", not_found: "Spelarnumret hittades inte.", failed: "Testnotisen kunde inte skickas." }[response.result]); }}><BellRing />Skicka testnotis</Button></div>{pushMessage && <p className="mt-2 text-sm" role="status">{pushMessage}</p>}</section>
        <section><h2 className="mb-2 font-semibold">Händelser under perioden</h2>{[["Annonser", stats.ads], ["Fel", stats.errors], ["Spel", stats.play]].map(([label, values]) => <div key={label as string} className="mb-2"><p className="text-sm font-medium">{label as string}</p>{(values as [string, number][]).length ? (values as [string, number][]).map(([name, count]) => <p key={name} className="truncate text-xs text-muted-foreground">{name}: <b>{count}</b></p>) : <p className="text-xs text-muted-foreground">Inga rapporter ännu.</p>}</div>)}</section></div>
        <section className="mt-5"><h2 className="mb-2 font-semibold">Senaste feldetaljer</h2>{stats.recentErrors.length ? <div className="space-y-2">{stats.recentErrors.map((event, index) => <details key={`${event.created_at}-${index}`} className="rounded-md border border-border p-2 text-xs"><summary className="cursor-pointer">{event.created_at.slice(0, 16).replace("T", " ")} · {event.platform} · {event.name}</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-muted-foreground">{event.detail || "Ingen detalj"}</pre></details>)}</div> : <p className="text-xs text-muted-foreground">Inga feldetaljer under perioden.</p>}</section>
      </details>
    </>}
    <details className="mt-6 border-t border-border pt-4"><summary className="cursor-pointer font-semibold">iPhone/Android – appstartsdiagnostik</summary><div className="my-3 flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={!diagnostics} onClick={() => { void navigator.clipboard.writeText(diagnostics).then(() => setCopied(true)).catch(() => setError("Kopiering gick inte.")); }}><Copy />{copied ? "Kopierat" : "Kopiera"}</Button></div><textarea readOnly aria-label="Appstartsloggar" value={diagnostics || "Inga appstartshändelser registrerade de senaste 30 dagarna."} className="h-64 w-full rounded-md border border-border bg-background p-3 font-mono text-xs text-foreground" /></details>
  </div>;
}
