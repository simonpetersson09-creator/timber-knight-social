import type { Level } from "./engine";

/** Wins needed on the previous level to unlock each level. */
export const UNLOCK: Record<Level, { after: Level | null; wins: number }> = {
  beginner: { after: null, wins: 0 },
  easy: { after: null, wins: 0 },
  medium: { after: "easy", wins: 2 },
  hard: { after: "medium", wins: 3 },
  expert: { after: "hard", wins: 3 },
  master: { after: "expert", wins: 5 },
};

export function isUnlocked(level: Level, levelWins: Partial<Record<Level, number>>): boolean {
  const r = UNLOCK[level];
  return r.after === null || (levelWins[r.after] ?? 0) >= r.wins;
}
