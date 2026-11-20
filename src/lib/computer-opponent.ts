import type { Level } from "./engine";

export type ComputerIcon = "pawn" | "knight" | "bishop" | "crown";

/** Neutral identities for the computer; the four quick-play levels use distinct names and icons. */
export const COMPUTER_OPPONENTS: Record<Level, { name: string; icon: ComputerIcon }> = {
  beginner: { name: "Noa", icon: "pawn" },
  easy: { name: "Noa", icon: "pawn" },
  medium: { name: "Alva", icon: "knight" },
  hard: { name: "Kim", icon: "bishop" },
  expert: { name: "Sam", icon: "crown" },
  master: { name: "Sam", icon: "crown" },
};

export function computerDisplayName(level: Level, translatedLevel: string): string {
  return `${COMPUTER_OPPONENTS[level].name} (${translatedLevel})`;
}
