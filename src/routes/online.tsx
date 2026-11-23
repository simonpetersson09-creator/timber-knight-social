import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Send, KeyRound, Users, ChevronRight, ScanLine, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { QrScanner } from "@/components/QrScanner";
import { useMe } from "@/hooks/use-me";
import { useI18n } from "@/lib/i18n";
import { getCred } from "@/lib/identity";
import { createLobby, joinGame } from "@/lib/online.functions";
import { askPushOnFirstOnline } from "@/lib/push";
import { report } from "@/lib/report";

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

/** Compact two-card layout: invite (create) and join with a code. */
function FriendPlay() {
  const { t } = useI18n();
  const { me, failed } = useMe();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scanned = useCallback((value: string) => { setCode(value); setScanning(false); }, []);
  useEffect(() => { void askPushOnFirstOnline(); }, []);
  async function enter(kind: "create" | "join") {
    if (busy || !me) return;
    setBusy(true);
    try {
      await navigate({ to: "/match", search: { id: kind === "join" ? `join:${code}` : "lobby" } });
    } catch { toast.error(t("error")); } finally { setBusy(false); }
  }
  const ready = code.length === 6;
  return <main className="page-screen online-page">
    <PageHeader title={t("playOnline")} />
    {failed && <p className="online-error text-center text-sm text-destructive">{t("error")}</p>}
    <div className="online-options">
      <section className="lobby-card lobby-card-create">
        <div className="flex items-start gap-3">
          <div className="lobby-card-icon"><Send /></div>
          <div className="min-w-0"><p className="lobby-card-title">{t("lobbyCreateTitle")}</p><p className="lobby-card-hint">{t("lobbyCreateHint")}</p></div>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} className="lobby-btn lobby-btn-create" disabled={!me || busy} onClick={() => enter("create")}>
          {busy ? <Loader2 className="mx-auto size-5 animate-spin" /> : t("createGame")}
        </motion.button>
        <Link to="/friends" className="lobby-friends-link"><Users className="size-3.5" /><span>{t("lobbyFriendsLink")}</span><ChevronRight className="size-3.5" /></Link>
      </section>

      <div className="flex items-center gap-3"><div className="h-px flex-1 bg-border" /><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("or")}</span><div className="h-px flex-1 bg-border" /></div>

      <section className="lobby-card lobby-card-join">
        <div className="flex items-start gap-3">
          <div className="lobby-card-icon"><KeyRound /></div>
          <div className="min-w-0"><p className="lobby-card-title">{t("lobbyJoinTitle")}</p><p className="lobby-card-hint">{t("lobbyJoinHint")}</p></div>
        </div>
        <div className="flex gap-2">
          <input aria-label={t("lobbyCode")} className="lobby-code-input" value={code} maxLength={6} autoComplete="off" placeholder="ABC123"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} />
          <motion.button whileTap={{ scale: 0.95 }} className="lobby-scan" aria-label={t("scanQr")} onClick={() => setScanning(true)}>
            <ScanLine className="size-5" /><span>{t("scanShort")}</span>
          </motion.button>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} className="lobby-btn lobby-btn-join" data-ready={ready} disabled={!me || busy || !ready} onClick={() => enter("join")}>
          {busy ? <Loader2 className="mx-auto size-5 animate-spin" /> : t("joinGame")}
        </motion.button>
      </section>
    </div>
    {scanning && <QrScanner onCode={scanned} onClose={() => setScanning(false)} />}
  </main>;
}
