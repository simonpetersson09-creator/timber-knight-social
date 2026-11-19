import { setPlayerWord } from "@/lib/profile";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LANGUAGES, type Key } from "./keys";
import { translate } from "./translate";
import { getSettings, saveSettings } from "../storage";

export { LANGUAGES, translate, type Key };
const CODES: string[] = LANGUAGES.map((l) => l.code);

/** Maps device language tags (e.g. "nb-NO", "pt-BR") to a supported language, English as fallback. */
export function resolveDeviceLang(tags: readonly string[]): string {
  for (const tag of tags) {
    if (CODES.includes(tag)) return tag;
    const base = tag.toLowerCase().split("-")[0] ?? "";
    if (base === "pt") return tag.toUpperCase().endsWith("PT") ? "pt-PT" : "pt-BR";
    if (base === "nb" || base === "nn") return "no";
    if (CODES.includes(base)) return base;
  }
  return "en";
}

type Ctx = { lang: string; choice: string; setLang: (l: string) => void; t: (k: Key, p?: Record<string, string | number>) => string };
const I18n = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState("auto");
  const [lang, setLangState] = useState("sv");
  useEffect(() => {
    const c = getSettings().lang;
    setChoice(c);
    setLangState(c === "auto" ? resolveDeviceLang(navigator.languages ?? [navigator.language]) : c);
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = useCallback((l: string) => {
    saveSettings({ ...getSettings(), lang: l });
    setChoice(l);
    setLangState(l === "auto" ? resolveDeviceLang(navigator.languages ?? [navigator.language]) : l);
  }, []);
  const value = useMemo<Ctx>(() => { setPlayerWord(translate(lang, "playerN")); return { lang, choice, setLang, t: (k, p) => translate(lang, k, p) }; }, [lang, choice, setLang]);
  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

export function useI18n() {
  const c = useContext(I18n);
  if (!c) throw new Error("useI18n outside provider");
  return c;
}
