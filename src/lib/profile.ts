export const NAME_MAX = 20;
export const AVATARS = ["♞", "♜", "♝", "♛", "♚", "♟", "🦁", "🦊", "🐻", "🦉", "🐺", "🐯", "🦅", "🐲", "🎩", "👑"];
export const COUNTRIES = ["SE","NO","DK","FI","IS","DE","GB","IE","FR","ES","PT","IT","NL","BE","CH","AT","PL","CZ","SK","SI","HR","HU","RO","GR","TR","UA","RU","US","CA","MX","BR","AR","IN","BD","ID","MY","VN","TH","JP","KR","CN","AU","NZ","ZA","EG","NG"];
export const flagOf = (cc: string) => String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));

/** Trims and validates a display name; returns null for empty (= nameless), throws on invalid. */
export function cleanName(raw: string): string | null {
  const n = raw.trim().replace(/\s+/g, " ");
  if (!n) return null;
  if ([...n].length > NAME_MAX) throw new Error("too_long");
  if (/^(spelare|player)\s*#?\d+$/i.test(n)) throw new Error("taken"); // reserved for default names
  return n;
}
let playerWord = "Spelare {n}";
/** Set by the i18n provider so default names follow the app language. */
export const setPlayerWord = (w: string) => { playerWord = w; };
/** Stable 4-digit suffix per player, unique for the first 9000 players (7919 is coprime with 9000). */
export const anonDigits = (n: number) => (n <= 9000 ? 1000 + ((n * 7919) % 9000) : 9000 + n);
export const displayName = (p: { name: string | null; player_number: number }) =>
  p.name ?? playerWord.replace("{n}", String(anonDigits(p.player_number)));
/** Guesses the device country from its language region (e.g. sv-SE → SE) or time zone. */
export function guessCountry(langs: readonly string[], tz: string | null): string | null {
  for (const l of langs) { const r = l.split(/[-_]/)[1]?.toUpperCase(); if (r && COUNTRIES.includes(r)) return r; }
  const TZ: Record<string, string> = { "Europe/Stockholm": "SE", "Europe/Oslo": "NO", "Europe/Copenhagen": "DK", "Europe/Helsinki": "FI", "Europe/Berlin": "DE", "Europe/London": "GB", "Europe/Paris": "FR", "Europe/Madrid": "ES", "Europe/Rome": "IT", "Europe/Amsterdam": "NL", "Europe/Warsaw": "PL", "America/New_York": "US", "America/Chicago": "US", "America/Los_Angeles": "US", "Asia/Tokyo": "JP", "Australia/Sydney": "AU" };
  return (tz && TZ[tz]) ?? null;
}
export const ONLINE_MS = 2 * 60_000;
export const isOnline = (lastSeen: string, now = Date.now()) => now - new Date(lastSeen).getTime() < ONLINE_MS;

export function friendCode(): string {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(6));
  return [...b].map((x) => a[x % a.length]).join("");
}
