import { PlayerAvatar } from "@/components/PlayerAvatar";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Send, Share2, X, UserPlus, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/Modal";
import { QrScanner } from "@/components/QrScanner";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/PageHeader";
import { useMe } from "@/hooks/use-me";
import { useI18n } from "@/lib/i18n";
import { getCred } from "@/lib/identity";
import { getFriends, respondFriend, sendFriendRequest } from "@/lib/players.functions";
import { inviteFriend } from "@/lib/online.functions";
import { displayName, flagOf, isOnline } from "@/lib/profile";
import { report } from "@/lib/report";

export const Route = createFileRoute("/friends")({
  validateSearch: z.object({ code: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Vänner – Mr B Chess" },
      { name: "description", content: "Lägg till vänner med vänkod eller QR och se er statistik." },
      { property: "og:title", content: "Vänner – Mr B Chess" },
      { property: "og:description", content: "Lägg till vänner med vänkod eller QR och se er statistik." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FriendsPage,
});

type Row = Awaited<ReturnType<typeof getFriends>>[number];

function FriendsPage() {
  const { t } = useI18n();
  const { code: linkCode } = Route.useSearch();
  const { me } = useMe();
  const [rows, setRows] = useState<Row[]>([]);
  const [code, setCode] = useState(linkCode ?? "");
  const [qr, setQr] = useState("");
  const [adding, setAdding] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [sending, setSending] = useState(false);
  const scanned = useCallback((value: string) => { setCode(value); setScanning(false); }, []);
  const sentLink = useRef(false);
  const navigate = useNavigate();
  async function invite(friend: string) {
    try { const r = await inviteFriend({ data: { ...getCred(), friend } }); report("play", "online_room_created", r.id); await navigate({ to: "/match", search: { id: r.id } }); }
    catch { toast.error(t("error")); }
  }

  const refresh = useCallback(() => { getFriends({ data: getCred() }).then(setRows).catch(() => {}); }, []);
  useEffect(() => { if (!me) return; refresh(); const i = setInterval(refresh, 30_000); return () => clearInterval(i); }, [me, refresh]);
  const link = me ? `${typeof window !== "undefined" ? window.location.origin : ""}/add?code=${me.friend_code}` : "";
  useEffect(() => { if (link) void QRCode.toDataURL(link, { margin: 1, width: 360, color: { dark: "#0b2a2e", light: "#f5ecd7" } }).then(setQr); }, [link]);

  const send = useCallback(async (c: string) => {
    if (sending) return;
    setSending(true);
    try {
      const r = await sendFriendRequest({ data: { ...getCred(), code: c } });
      const msg = { sent: t("requestSent"), accepted: t("nowFriends"), already: t("alreadyFriends"), not_found: t("notFound"), self: t("selfCode") }[r.result];
      (r.result === "sent" || r.result === "accepted" ? toast.success : toast.error)(msg);
      if (r.result === "sent" || r.result === "accepted" || r.result === "already") { setCode(""); setAdding(false); }
      refresh();
    } catch { toast.error(t("error")); } finally { setSending(false); }
  }, [t, refresh, sending]);
  useEffect(() => { if (me && linkCode && !sentLink.current) { sentLink.current = true; void send(linkCode); } }, [me, linkCode, send]);

  async function act(fid: string, action: "accept" | "remove") {
    try { await respondFriend({ data: { ...getCred(), fid, action } }); refresh(); } catch { toast.error(t("error")); }
  }
  async function share() {
    if (navigator.share) { try { await navigator.share({ title: "Mr B Chess", text: `${t("yourCode")}: ${me?.friend_code}`, url: link }); } catch { /* cancelled */ } }
    else { await navigator.clipboard.writeText(link); toast.success(t("saved")); }
  }

  const friends = rows.filter((r) => r.kind === "friend").sort((a, b) => Number(isOnline(b.player.last_seen)) - Number(isOnline(a.player.last_seen)));
  const incoming = rows.filter((r) => r.kind === "incoming");
  const outgoing = rows.filter((r) => r.kind === "outgoing");

  return (
    <main className="page-screen flex flex-col gap-4">
      <PageHeader title={t("friends")} />
      <Button className="action-btn action-gold" onClick={() => setAdding(true)}><UserPlus />{t("addFriend")}</Button>
      <Section title={t("friends")}>
        {friends.length === 0 && <p className="py-2 text-center text-sm text-muted-foreground">{t("noFriends")}</p>}
        {friends.map((r) => <PlayerRow key={r.id} r={r} showStats>
          <Button variant="ghost" size="icon" className="icon-btn icon-ok" aria-label={t("inviteFriend")} onClick={() => void invite(r.player.id)}><Send className="size-4" /></Button>
          <Button variant="ghost" size="icon" className="icon-btn" aria-label={t("remove")} onClick={() => { if (confirm(`${t("remove")} ${displayName(r.player)}?`)) void act(r.id, "remove"); }}><X className="size-4" /></Button>
        </PlayerRow>)}
      </Section>
      <Modal open={adding} onClose={() => setAdding(false)}>
      <div className="flex flex-col items-center gap-3">
        <p className="field-label">{t("yourCode")}</p>
        <div className="friend-code">{me?.friend_code ?? "······"}</div>
        {qr && <img src={qr} alt={t("scanToAdd")} className="size-40 rounded-xl" />}
        <p className="text-xs text-muted-foreground">{t("scanToAdd")}</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="round-btn" aria-label={t("yourCode")} onClick={() => { void navigator.clipboard.writeText(me?.friend_code ?? ""); toast.success(me?.friend_code ?? ""); }}><Copy className="size-5" /></Button>
          <Button variant="ghost" size="icon" className="round-btn" aria-label={t("shareLink")} onClick={share}><Share2 className="size-5" /></Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-4">
        <label className="field-label" htmlFor="code">{t("addFriend")}</label>
        <div className="flex gap-2">
          <input id="code" className="text-field flex-1 uppercase tracking-[0.3em]" maxLength={6} value={code} placeholder={t("enterCode")}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} />
          <Button variant="ghost" size="icon" className="shrink-0" aria-label={t("scanQr")} onClick={() => setScanning(true)}><ScanLine /></Button>
        </div>
        <Button className="action-btn action-gold" disabled={code.length !== 6 || !me || sending} onClick={() => send(code)}><UserPlus />{t("addFriend")}</Button>
      </div>
      </Modal>
      {scanning && <QrScanner onCode={scanned} onClose={() => setScanning(false)} />}

      {incoming.length > 0 && (
        <Section title={t("requests")}>
          {incoming.map((r) => (
            <PlayerRow key={r.id} r={r}>
              <button className="icon-btn icon-ok" aria-label={t("accept")} onClick={() => act(r.id, "accept")}><Check className="size-4" /></button>
              <button className="icon-btn" aria-label={t("decline")} onClick={() => act(r.id, "remove")}><X className="size-4" /></button>
            </PlayerRow>
          ))}
        </Section>
      )}

      {outgoing.length > 0 && (
        <Section title={t("sentRequests")}>
          {outgoing.map((r) => (
            <PlayerRow key={r.id} r={r}>
              <button className="text-xs font-semibold text-muted-foreground underline" onClick={() => act(r.id, "remove")}>{t("withdraw")}</button>
            </PlayerRow>
          ))}
        </Section>
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="flex flex-col gap-2"><h2 className="settings-heading">{title}</h2>{children}</section>;
}

function PlayerRow({ r, showStats, children }: { r: Row; showStats?: boolean; children: React.ReactNode }) {
  const { t } = useI18n();
  const on = isOnline(r.player.last_seen);
  return (
    <div className="friend-row">
      <span className="friend-avatar"><PlayerAvatar avatar={r.player.avatar} /><span className="status-dot" data-on={on} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{displayName(r.player)} {r.player.country && flagOf(r.player.country)}</span>
        <span className="block text-xs text-muted-foreground">
          {showStats ? `${on ? t("online") : t("offline")} · ${r.stats.w} ${t("wins")} · ${r.stats.l} ${t("losses")} · ${r.stats.d} ${t("draws")}` : on ? t("online") : t("offline")}
        </span>
        {showStats && r.recent.length > 0 && (
          <span className="mt-1 flex gap-1">{r.recent.map((g, i) => <span key={i} className="result-pip" data-r={g.r}>{g.r === "w" ? "✓" : g.r === "l" ? "✗" : "="}</span>)}</span>
        )}
      </span>
      {children}
    </div>
  );
}
