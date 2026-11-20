import { Check } from "lucide-react";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import { Modal } from "./Modal";
import { report } from "@/lib/report";

export function LanguageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, choice, setLang } = useI18n();
  const pick = (c: string) => { if (c !== choice) report("play", "language_changed", c); setLang(c); onClose(); };
  const item = (value: string, icon: string, name: string) => (
    <label className="lang-row" data-active={choice === value}>
      <input
        type="radio"
        name="language"
        className="sr-only"
        value={value}
        checked={choice === value}
        onChange={() => pick(value)}
      />
      <span className="text-xl" aria-hidden="true">{icon}</span>
      <span className="flex-1 text-left">{name}</span>
      {choice === value && <Check className="size-4" aria-hidden="true" />}
    </label>
  );
  return (
    <Modal open={open} onClose={onClose} title={t("language")}>
      <h2 className="brand-wordmark mb-3 text-center text-2xl">{t("language")}</h2>
      <div className="lang-list" role="radiogroup" aria-label={t("language")}>
        {item("auto", "🌐", t("automatic"))}
        {LANGUAGES.map((language) => <span key={language.code} className="contents">{item(language.code, language.flag, language.name)}</span>)}
      </div>
    </Modal>
  );
}
