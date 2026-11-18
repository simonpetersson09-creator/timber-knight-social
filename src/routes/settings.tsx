import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { LanguageSheet } from "@/components/LanguageSheet";
import { Modal } from "@/components/Modal";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import { getSettings, resetStats, saveSettings, type Settings } from "@/lib/storage";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Inställningar – Mr B Chess" },
      { name: "description", content: "Språk, ljud och vibration i Mr B Chess." },
      { property: "og:title", content: "Inställningar – Mr B Chess" },
      { property: "og:description", content: "Språk, ljud och vibration i Mr B Chess." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t, choice } = useI18n();
  const [s, setS] = useState<Settings | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setS(getSettings()), []);
  const update = (patch: Partial<Settings>) => { const n = { ...getSettings(), ...patch }; saveSettings(n); setS(n); };
  const langName = choice === "auto" ? t("automatic") : LANGUAGES.find((l) => l.code === choice)?.name;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 pt-[calc(20px+env(safe-area-inset-top))] pb-8">
      <header className="flex items-center gap-3">
        <Link to="/" className="action-ghost flex size-10 items-center justify-center rounded-full" aria-label={t("back")}><ArrowLeft className="size-5" /></Link>
        <h1 className="brand-wordmark text-3xl">{t("settings")}</h1>
      </header>
      <div className="panel divide-y divide-border">
        <button className="toggle-row w-full" onClick={() => setLangOpen(true)}>
          <span className="font-semibold">{t("language")}</span>
          <span className="flex items-center gap-1 text-muted-foreground">{langName}<ChevronRight className="size-4" /></span>
        </button>
        <label className="toggle-row">
          <span className="font-semibold">{t("sound")}</span>
          <Switch checked={s?.sound ?? true} onCheckedChange={(v) => update({ sound: v })} />
        </label>
        <label className="toggle-row">
          <span className="font-semibold">{t("haptics")}</span>
          <Switch checked={s?.haptics ?? true} onCheckedChange={(v) => update({ haptics: v })} />
        </label>
      </div>
      <button className="action-btn action-ghost text-destructive" onClick={() => setConfirm(true)}>{t("resetStats")}</button>
      <LanguageSheet open={langOpen} onClose={() => setLangOpen(false)} />
      <Modal open={confirm} onClose={() => setConfirm(false)}>
        <p className="mb-4 text-center font-semibold">{t("confirmReset")}</p>
        <div className="flex gap-2">
          <button className="action-btn action-ghost" onClick={() => setConfirm(false)}>{t("cancel")}</button>
          <button className="action-btn action-gold" onClick={() => { resetStats(); setConfirm(false); toast.success(t("resetStats")); }}>{t("accept")}</button>
        </div>
      </Modal>
    </main>
  );
}
