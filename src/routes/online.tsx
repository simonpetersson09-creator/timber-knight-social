import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Send, KeyRound, Users, ChevronRight, Mail, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { QrScanner } from "@/components/QrScanner";
import { useMe } from "@/hooks/use-me";
import { useI18n } from "@/lib/i18n";
import { getCred } from "@/lib/identity";
import { createLobby, inviteFriend, joinGame } from "@/lib/online.functions";
import { getFriends } from "@/lib/players.functions";
import { askPushOnFirstOnline } from "@/lib/push";
import { displayName, isOnline } from "@/lib/profile";

export const Route = createFileRoute("/online")({
  head: () => ({ meta: [
    { title: "Spela med vän – Mr B Chess" },
    { name: "description", content: "Bjud in en vän till schack eller gå med med en lobbykod i Mr B Chess." },
    { property: "og:title", content: "Spela med vän – Mr B Chess" },
    { property: "og:description", content: "Skapa ett parti, dela kod och QR eller bjud in en vän direkt." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: FriendPlay,
});

function FriendPlay() {
  const { t } = useI18n();
  const { me, failed } = useMe();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scanned = useCallback((value: string) => { setCode(value); setScanning(false); }, []);
  const [friends, setFriends] = useState<Awaited<ReturnType<typeof getFriends>>>([]);
  useEffect(() => {
    void askPushOnFirstOnline();
    if (me) void getFriends({ data: getCred() }).then((r) => setFriends(r.filter((f) => f.kind === "friend"))).catch(() => {});
  }, [me]);
  async function enter(kind: "create" | "join" | "invite", friend?: string) {
    if (busy || !me) return;
    setBusy(true);
    try {
      if (kind === "join") {
        const r = await joinGame({ data: { ...getCred(), code } });
        if (r.result !== "ok") { toast.error(t(r.result === "expired" ? "expired" : "notFound")); return; }
        await navigate({ to: "/match", search: { id: r.id } });
      } else {
        const r = kind === "invite" && friend ? await inviteFriend({ data: { ...getCred(), friend } }) : await createLobby({ data: getCred() });
        await navigate({ to: "/match", search: { id: r.id } });
      }
    } catch { toast.error(t("error")); } finally { setBusy(false); }
  }
  return <main className="page-screen space-y-6">
    <PageHeader title={t("playOnline")} />
    <div className="settings-row px-0"><Users /><span className="min-w-0 flex-1 truncate font-semibold">{me ? displayName(me) : "…"}</span></div>
    {failed && <p className="text-sm text-destructive">{t("error")}</p>}
    <section className="lobby-section space-y-4">
      <h2 className="flex items-center gap-3 text-lg font-bold"><Send className="size-5 text-primary" />{t("createGame")}</h2>
      <Button variant="ghost" className="action-btn action-gold" disabled={!me || busy} onClick={() => enter("create")}><Send />{t("createGame")}</Button>
      <Button variant="ghost" className="w-full text-primary" disabled={!me || busy} onClick={() => setPicking(!picking)} aria-expanded={picking}><Users />{t("inviteFriend")}<ChevronRight className={picking ? "rotate-90" : ""} /></Button>
      {picking && <div>
        {friends.length === 0 && <p className="py-3 text-center text-sm text-muted-foreground">{t("noFriends")}</p>}
        {friends.map((f) => <Button variant="ghost" key={f.id} className="friend-row h-auto w-full justify-start" disabled={busy} onClick={() => enter("invite", f.player.id)}>
          <span className="friend-avatar"><PlayerAvatar avatar={f.player.avatar} /><span className="status-dot" data-on={isOnline(f.player.last_seen)} /></span>
          <span className="min-w-0 flex-1 truncate text-left">{displayName(f.player)}</span><Mail />
        </Button>)}
        <Button asChild variant="link" className="w-full"><Link to="/friends">{t("addFriend")}</Link></Button>
      </div>}
    </section>
    <section className="lobby-section space-y-4">
      <h2 className="flex items-center gap-3 text-lg font-bold"><KeyRound className="size-5 text-accent" />{t("joinGame")}</h2>
      <label className="field-label" htmlFor="lobby-code">{t("lobbyCode")}</label>
      <input id="lobby-code" className="text-field text-center text-xl uppercase" value={code} maxLength={6} autoComplete="off" onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="ABC123" />
      <Button variant="ghost" className="action-btn action-blue" disabled={!me || busy || code.length !== 6} onClick={() => enter("join")}><KeyRound />{t("join")}</Button>
      <Button variant="ghost" className="w-full text-accent" onClick={() => setScanning(true)}><ScanLine />{t("scanQr")}</Button>
    </section>
    <Button asChild variant="link" className="w-full"><Link to="/friends"><Users />{t("friends")}<ChevronRight /></Link></Button>
    {scanning && <QrScanner onCode={scanned} onClose={() => setScanning(false)} />}
  </main>;
}