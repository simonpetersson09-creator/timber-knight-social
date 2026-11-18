import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { adminSetTest, adminStats } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin – Mr B Chess" },
      { name: "description", content: "Statistik för Mr B Chess." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin – Mr B Chess" },
      { property: "og:description", content: "Statistik för Mr B Chess." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

type S = Awaited<ReturnType<typeof adminStats>>;
function Admin() {
  const [pw, setPw] = useState("");
  const [s, setS] = useState<S | null>(null);
  const [err, setErr] = useState("");
  const [num, setNum] = useState("");
  const load = async () => { setErr(""); try { setS(await adminStats({ data: { password: pw } })); } catch { setErr("Fel lösenord"); } };
  if (!s) return (
    <main className="mx-auto flex min-h-dvh max-w-xs flex-col justify-center gap-3 px-5">
      <h1 className="brand-wordmark text-center text-3xl">Admin</h1>
      <input className="text-field" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Lösenord" onKeyDown={(e) => e.key === "Enter" && void load()} />
      <button className="action-btn action-gold" onClick={load}>Logga in</button>
      {err && <p className="text-center text-sm text-destructive">{err}</p>}
    </main>
  );
  const max = Math.max(1, ...s.days.map((d) => d.total));
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-5 py-8">
      <h1 className="brand-wordmark text-3xl">Admin</h1>
      <section className="panel p-4">
        <h2 className="mb-3 font-bold">Telefoner per dag (30 dagar, utan testtelefoner)</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-muted-foreground"><th>Dag</th><th>iOS</th><th>Android</th><th>Totalt</th><th className="w-1/3" /></tr></thead>
          <tbody>{s.days.map((d) => (
            <tr key={d.day}><td>{d.day}</td><td>{d.ios}</td><td>{d.android}</td><td className="font-bold">{d.total}</td>
              <td><div className="h-2 rounded bg-primary" style={{ width: `${(d.total / max) * 100}%` }} /></td></tr>
          ))}</tbody>
        </table>
      </section>
      <section className="panel p-4">
        <h2 className="mb-2 font-bold">Annonser (30 dagar)</h2>
        {s.ads.length === 0 ? <p className="text-sm text-muted-foreground">Inga rapporter ännu.</p> : s.ads.map(([n, c]) => <p key={n} className="text-sm">{n}: <b>{c}</b></p>)}
      </section>
      <section className="panel p-4">
        <h2 className="mb-2 font-bold">Fel (30 dagar)</h2>
        {s.errors.length === 0 ? <p className="text-sm text-muted-foreground">Inga fel.</p> : s.errors.map(([n, c]) => <p key={n} className="truncate text-sm">{n}: <b>{c}</b></p>)}
      </section>
      <section className="panel flex flex-col gap-2 p-4">
        <h2 className="font-bold">Testtelefoner</h2>
        <p className="text-sm text-muted-foreground">Spelarnummer syns i appens inställningar. Nu: {s.testPlayers.join(", ") || "inga"}</p>
        <div className="flex gap-2">
          <input className="text-field" inputMode="numeric" value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, ""))} placeholder="Spelarnummer" />
          <button className="action-btn action-gold !w-auto px-4" onClick={async () => { await adminSetTest({ data: { password: pw, playerNumber: Number(num), isTest: true } }); setNum(""); void load(); }}>Lägg till</button>
          <button className="action-btn action-ghost !w-auto px-4" onClick={async () => { await adminSetTest({ data: { password: pw, playerNumber: Number(num), isTest: false } }); setNum(""); void load(); }}>Ta bort</button>
        </div>
      </section>
    </main>
  );
}
