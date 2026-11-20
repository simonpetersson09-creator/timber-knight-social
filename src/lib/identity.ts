import { registerPlayer } from "./players.functions";
import { allowsGameplayRuntime, isNative, platform } from "./native";
import { guessCountry } from "./profile";

const K = "mrbchess.identity.v1";
export type Cred = { id: string; secret: string };
let current: Cred | null = null;
let prepared: Promise<void> | null = null;

function validCred(value: unknown): Cred | null {
  if (!value || typeof value !== "object") return null;
  const c = value as Partial<Cred>;
  return typeof c.id === "string" && typeof c.secret === "string" ? { id: c.id, secret: c.secret } : null;
}

/** Restores the anonymous identity from iOS Keychain / Android Keystore and migrates older installs once. */
export function prepareIdentity(): Promise<void> {
  if (!isNative()) return Promise.resolve();
  if (!prepared) prepared = (async () => {
    const { SecureStorage } = await import("@aparajita/capacitor-secure-storage");
    await SecureStorage.setKeyPrefix("mrbchess.");
    const stored = validCred(await SecureStorage.get(K).catch(() => null));
    let legacy: Cred | null = null;
    try { legacy = validCred(JSON.parse(localStorage.getItem(K) ?? "null")); } catch { /* invalid legacy value */ }
    current = stored ?? legacy;
    if (!current) current = getCred();
    if (!stored) await SecureStorage.set(K, current);
    try { localStorage.removeItem(K); } catch { /* storage unavailable */ }
  })().catch((error) => { prepared = null; throw error; });
  return prepared;
}

/** Anonymous device identity – no login. Created once, kept in secure native storage when available. */
export function getCred(): Cred {
  if (current) return current;
  try { const v = localStorage.getItem(K); if (v) { const parsed = validCred(JSON.parse(v)); if (parsed) { current = parsed; return parsed; } } } catch { /* ignore */ }
  current = { id: crypto.randomUUID(), secret: crypto.randomUUID() + crypto.randomUUID() };
  try { localStorage.setItem(K, JSON.stringify(current)); } catch { /* storage unavailable */ }
  return current;
}

export type Me = Awaited<ReturnType<typeof registerPlayer>>;
let cached: Promise<Me> | null = null;
export function loadMe(fresh = false): Promise<Me> {
  if (!allowsGameplayRuntime()) return Promise.reject(new Error("app_required"));
  if (!cached || fresh) {
    cached = (async () => {
      await prepareIdentity();
      const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; } })();
      const lang = document.documentElement.lang || "en";
      return registerPlayer({ data: { ...getCred(), platform: platform(), tz, lang, country: guessCountry(navigator.languages ?? [navigator.language], tz) } });
    })();
    cached.catch(() => { cached = null; });
  }
  return cached;
}

export function clearIdentity() {
  current = null;
  try { localStorage.removeItem(K); } catch { /* ignore */ }
  if (isNative()) void import("@aparajita/capacitor-secure-storage").then(async ({ SecureStorage }) => {
    await SecureStorage.setKeyPrefix("mrbchess.");
    await SecureStorage.remove(K);
  }).catch(() => {});
  cached = null;
}
