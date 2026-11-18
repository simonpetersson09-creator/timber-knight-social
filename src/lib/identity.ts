import { registerPlayer } from "./players.functions";
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
export const loadMe = () => registerPlayer({ data: getCred() });
