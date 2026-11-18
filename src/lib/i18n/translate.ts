import { KEYS, type Key } from "./keys";
import { EUROPE } from "./locales-europe";
import { ASIA } from "./locales-asia";
export type { Key };
const RAW: Record<string, string[]> = { ...EUROPE, ...ASIA };
export function translate(lang: string, key: Key, params?: Record<string, string | number>): string {
  const i = KEYS.indexOf(key);
  let s = RAW[lang]?.[i] ?? RAW["en"]?.[i] ?? RAW["sv"]?.[i] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
