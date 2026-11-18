// Device-local counters for ad and rating rules.
const K = "mrbchess.meta.v1";
export type Meta = { finished: number; rateAsked: number; pushAsked: boolean };
export function getMeta(): Meta {
  try { return { finished: 0, rateAsked: 0, pushAsked: false, ...(JSON.parse(localStorage.getItem(K) ?? "{}") as Partial<Meta>) }; } catch { return { finished: 0, rateAsked: 0, pushAsked: false }; }
}
export function setMeta(patch: Partial<Meta>) { try { localStorage.setItem(K, JSON.stringify({ ...getMeta(), ...patch })); } catch { /* ignore */ } }
