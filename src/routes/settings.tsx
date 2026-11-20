import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, User, Globe, ChevronRight, Vibrate, Bell, BellRing, Gamepad2, ShieldCheck, Trash2, Check, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/PageHeader";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { LanguageSheet } from "@/components/LanguageSheet";
import { Modal } from "@/components/Modal";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import { getSettings, getStats, resetStats, saveSettings, type Settings } from "@/lib/storage";
import { useMe } from "@/hooks/use-me";
import { clearIdentity, getCred } from "@/lib/identity";
import { deleteMyData, setPush, updateProfile, saveProfilePhoto } from "@/lib/players.functions";
import { openAdChoices } from "@/lib/ads";
import { askPushOnFirstOnline } from "@/lib/push";
import { isNative } from "@/lib/native";
import { PRIVACY_POLICY_URL } from "@/lib/legal-links";
import { COUNTRIES, NAME_MAX, displayName, flagOf } from "@/lib/profile";
import { photoToJpeg } from "@/lib/photo";
import { report } from "@/lib/report";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [
    { title: "Inställningar – Mr B Chess" }, { name: "description", content: "Ändra namn, profilbild, land, språk, notiser och annonsval i Mr B Chess." },
    { property: "og:title", content: "Inställningar – Mr B Chess" }, { property: "og:description", content: "Din profil och dina spelinställningar i Mr B Chess." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: SettingsPage,
});

function SettingsPage() {
  const { t, choice, lang } = useI18n();
  const { me, reload } = useMe();
  const input = useRef<HTMLInputElement>(null);
  const [s, setS] = useState<Settings | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [wipe, setWipe] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("♞");
  const [country, setCountry] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<ReturnType<typeof getStats> | null>(null);
  const [prefs, setPrefs] = useState({ notify: true, notify_turn: true, notify_reminders: true, notify_play: true });
  useEffect(() => { setS(getSettings()); setStats(getStats()); report("play", "settings_opened"); }, []);
  useEffect(() => { if (me) { setName(me.name ?? ""); setAvatar(me.avatar); setCountry(me.country); setPrefs({ notify: me.notify, notify_turn: me.notify_turn, notify_reminders: me.notify_reminders, notify_play: me.notify_play }); } }, [me]);
  const region = (cc: string) => { try { return new Intl.DisplayNames([lang], { type: "region" }).of(cc) ?? cc; } catch { return cc; } };
  const langName = choice === "auto" ? t("automatic") : LANGUAGES.find((l) => l.code === choice)?.name;
  const update = (patch: Partial<Settings>) => { const n = { ...getSettings(), ...patch }; saveSettings(n); setS(n); };
  async function saveProfile(nextCountry = country) {
    if (!me || busy) return;
    setBusy(true);
    try {
      const r = await updateProfile({ data: { ...getCred(), name, country: nextCountry } });
      if (r.error) toast.error(t(r.error === "taken" ? "nameTaken" : r.error === "too_long" ? "nameTooLong" : "error"));
      else { setEditing(false); setCountry(nextCountry); reload(true); toast.success(t("saved")); }
    } catch { toast.error(t("error")); } finally { setBusy(false); }
  }
  async function photo(file: File | null) {
    if (!me || busy) return;
    setBusy(true);
    try {
      const jpeg = file ? await photoToJpeg(file) : null;
      const r = await saveProfilePhoto({ data: { ...getCred(), jpeg } });
      setAvatar(r.avatar); reload(true); toast.success(t("saved"));
    } catch { toast.error(t("error")); } finally { setBusy(false); }
  }
  async function toggleNotify(key: keyof typeof prefs, value: boolean) {
    const before = prefs;
    setPrefs({ ...prefs, [key]: value });
    try { if (value) await askPushOnFirstOnline(); await setPush({ data: { ...getCred(), [key]: value } }); }
    catch { setPrefs(before); toast.error(t("error")); }
  }
  async function eraseAll() {
    if (busy) return;
    setBusy(true);
    try {
      await deleteMyData({ data: getCred() }); clearIdentity();
      Object.keys(localStorage).filter((k) => k.startsWith("mrbchess.")).forEach((k) => localStorage.removeItem(k));
      setWipe(false); reload(true); setS(getSettings()); setStats(getStats()); toast.success(t("dataDeleted"));
    } catch { toast.error(t("error")); } finally { setBusy(false); }
  }
  const notificationRows = [["notify", Bell, "notifications"], ["notify_turn", Bell, "yourTurn"], ["notify_reminders", BellRing, "moveReminders"], ["notify_play", Gamepad2, "playReminders"]] as const;
  return <main className="page-screen space-y-5">
    <PageHeader title={t("settings")} />
    <Section title={t("profile")}>
      <div className="flex items-center gap-4 py-2">
        <Button variant="ghost" className="relative size-16 shrink-0 rounded-full border-2 border-primary/30 bg-secondary p-0 text-3xl" disabled={!me || busy} onClick={() => input.current?.click()} aria-label={t("changePhoto")}>
          <PlayerAvatar avatar={avatar} /><span className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1 text-primary-foreground"><Camera className="size-3" /></span>
        </Button>
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void photo(f); }} />
        <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{me ? displayName(me) : "…"}</p><div className="mt-2 flex gap-2">
          <Button variant="secondary" size="sm" disabled={!me || busy} onClick={() => input.current?.click()}><Camera />{t("changePhoto")}</Button>
          {avatar.startsWith("photo:") && <Button variant="ghost" size="icon" className="text-destructive" disabled={busy} aria-label={t("removePhoto")} onClick={() => photo(null)}><Trash2 /></Button>}
        </div></div>
      </div>
      <div className="settings-rows">
        {editing ? <form className="settings-row" onSubmit={(e) => { e.preventDefault(); void saveProfile(); }}><User /><input className="text-field min-w-0 flex-1" aria-label={t("name")} maxLength={NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} autoFocus /><Button type="submit" size="icon" disabled={busy} aria-label={t("save")}><Check /></Button></form>
          : <Button variant="ghost" className="settings-row" disabled={!me} onClick={() => setEditing(true)}><User /><span>{t("name")}</span><span className="row-value">{me ? displayName(me) : "…"}</span><ChevronRight className="size-4 text-muted-foreground" /></Button>}
        <label className="settings-row"><Globe className="size-4" /><span>{t("country")}</span><select aria-label={t("country")} className="ml-auto min-w-0 max-w-[60%] bg-transparent text-right text-sm text-muted-foreground" disabled={!me || busy} value={country ?? ""} onChange={(e) => void saveProfile(e.target.value || null)}><option value="" className="bg-background">{t("noCountry")}</option>{[...COUNTRIES].sort((a,b) => region(a).localeCompare(region(b), lang)).map((c) => <option key={c} value={c} className="bg-background">{flagOf(c)} {region(c)}</option>)}</select></label>
      </div>
    </Section>
    <Section title={t("gameSettings")}><div className="settings-rows">
      <Button asChild variant="ghost" className="settings-row"><Link to="/rules"><BookOpen /><span className="flex-1">{t("rules")}</span><ChevronRight /></Link></Button>
      <Button variant="ghost" className="settings-row" onClick={() => setLangOpen(true)}><Globe /><span>{t("language")}</span><span className="row-value">{langName}</span><ChevronRight /></Button>
      <label className="settings-row"><Vibrate className="size-4" /><span className="flex-1">{t("haptics")}</span><Switch aria-label={t("haptics")} checked={s?.haptics ?? true} onCheckedChange={(v) => update({ haptics: v })} /></label>
    </div></Section>
    <Section title={t("notifications")}><div className="settings-rows">{notificationRows.map(([key, Icon, label]) => <label key={key} className="settings-row"><Icon className="size-4" /><span className="flex-1">{t(label)}</span><Switch aria-label={t(label)} disabled={!me || (key !== "notify" && !prefs.notify)} checked={prefs[key]} onCheckedChange={(v) => void toggleNotify(key, v)} /></label>)}</div></Section>
    <Section title={t("stats")}><div className="settings-rows">
      <Button variant="ghost" className="settings-row text-destructive" onClick={() => setConfirm(true)}><Trash2 />{t("resetStats")}</Button>
    </div></Section>
    <Section title={t("adChoices")}><div className="settings-rows"><Button variant="ghost" className="settings-row" onClick={async () => { if (!isNative() || !(await openAdChoices())) toast(t("adChoicesApp")); }}><ShieldCheck /><span className="flex-1">{t("adChoices")}</span><ChevronRight /></Button></div></Section>
    <div className="settings-rows"><Button variant="ghost" className="settings-row text-destructive" disabled={!me || busy} onClick={() => setWipe(true)}><Trash2 />{t("deleteMyData")}</Button></div>
    <div className="settings-rows"><Button asChild variant="ghost" className="settings-row"><a href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer"><ShieldCheck /><span className="flex-1">{t("privacy")}</span><ChevronRight /></a></Button></div>
    <Button asChild variant="link" className="h-auto w-full whitespace-normal text-xs text-muted-foreground"><Link to="/legal">{t("legal")}</Link></Button>
    <LanguageSheet open={langOpen} onClose={() => setLangOpen(false)} />
    <Modal open={confirm} onClose={() => setConfirm(false)}><p className="mb-4 text-center font-semibold">{t("confirmReset")}</p><div className="flex gap-2"><Button variant="ghost" className="action-btn action-ghost" onClick={() => setConfirm(false)}>{t("cancel")}</Button><Button className="action-btn action-gold" onClick={() => { resetStats(); setStats(getStats()); setConfirm(false); toast.success(t("resetStats")); }}>{t("accept")}</Button></div></Modal>
    <Modal open={wipe} onClose={() => setWipe(false)}><p className="mb-4 text-center font-semibold">{t("confirmDeleteData")}</p><div className="flex gap-2"><Button variant="ghost" className="action-btn action-ghost" disabled={busy} onClick={() => setWipe(false)}>{t("cancel")}</Button><Button className="action-btn action-gold" disabled={busy} onClick={eraseAll}>{t("delete")}</Button></div></Modal>
  </main>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="settings-section"><h2 className="settings-heading">{title}</h2>{children}</section>; }
