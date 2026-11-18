export const NAME_MAX = 20;
export const AVATARS = ["♞", "♜", "♝", "♛", "♚", "♟", "🦁", "🦊", "🐻", "🦉", "🐺", "🐯", "🦅", "🐲", "🎩", "👑"];
export const COUNTRIES = ["SE","NO","DK","FI","IS","DE","GB","IE","FR","ES","PT","IT","NL","BE","CH","AT","PL","CZ","SK","SI","HR","HU","RO","GR","TR","UA","RU","US","CA","MX","BR","AR","IN","BD","ID","MY","VN","TH","JP","KR","CN","AU","NZ","ZA","EG","NG"];
export const flagOf = (cc: string) => String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));

/** Trims and validates a display name; returns null for empty (= nameless), throws on invalid. */
export function cleanName(raw: string): string | null {
  const n = raw.trim().replace(/\s+/g, " ");
  if (!n) return null;
  if ([...n].length > NAME_MAX) throw new Error("too_long");
  return n;
}
export const displayName = (p: { name: string | null; player_number: number }) => p.name ?? `#${p.player_number}`;
export const ONLINE_MS = 2 * 60_000;
export const isOnline = (lastSeen: string, now = Date.now()) => now - new Date(lastSeen).getTime() < ONLINE_MS;

export function friendCode(): string {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(6));
  return [...b].map((x) => a[x % a.length]).join("");
}
