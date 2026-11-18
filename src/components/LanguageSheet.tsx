import { Check } from "lucide-react";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import { Modal } from "./Modal";

export function LanguageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, choice, setLang } = useI18n();
  const pick = (c: string) => { setLang(c); onClose(); };
  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="brand-wordmark mb-3 text-center text-2xl">{t("language")}</h2>
      <div className="lang-list">
        <button className="lang-row" data-active={choice === "auto"} onClick={() => pick("auto")}>
          <span className="text-xl">🌐</span><span className="flex-1 text-left">{t("automatic")}</span>
          {choice === "auto" && <Check className="size-4" />}
        </button>
        {LANGUAGES.map((l) => (
          <button key={l.code} className="lang-row" data-active={choice === l.code} onClick={() => pick(l.code)}>
            <span className="text-xl">{l.flag}</span><span className="flex-1 text-left">{l.name}</span>
            {choice === l.code && <Check className="size-4" />}
          </button>
        ))}
      </div>
    </Modal>
  );
}
