import { registerPlayer } from "./players.functions";
import { platform } from "./native";
const K = "mrbchess.identity.v1";
export type Cred = { id: string; secret: string };
/** Anonymous device identity – no login. Created once, kept in device storage. */
export function getCred(): Cred {
  try { const v = localStorage.getItem(K); if (v) return JSON.parse(v) as Cred; } catch { /* ignore */ }
  const c = { id: crypto.randomUUID(), secret: crypto.randomUUID() + crypto.randomUUID() };
  localStorage.setItem(K, JSON.stringify(c));
  return c;
}
export type Me = Awaited<ReturnType<typeof registerPlayer>>;
let cached: Promise<Me> | null = null;
export function loadMe(fresh = false): Promise<Me> {
  if (!cached || fresh) {
    const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; } })();
    const lang = document.documentElement.lang || "en";
    cached = registerPlayer({ data: { ...getCred(), platform: platform(), tz, lang } });
    cached.catch(() => { cached = null; });
  }
  return cached;
}
export function clearIdentity() { try { localStorage.removeItem(K); } catch { /* ignore */ } cached = null; }
