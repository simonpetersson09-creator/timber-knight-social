import type { Level } from "./engine";

export type ComputerIcon = "puzzle" | "bot" | "brain" | "crown";

/** Neutral identities for the computer; the four quick-play levels use distinct names and icons. */
export const COMPUTER_OPPONENTS: Record<Level, { name: string; icon: ComputerIcon }> = {
  beginner: { name: "Noa", icon: "puzzle" },
  easy: { name: "Noa", icon: "puzzle" },
  medium: { name: "Alva", icon: "bot" },
  hard: { name: "Kim", icon: "brain" },
  expert: { name: "Sam", icon: "crown" },
  master: { name: "Sam", icon: "crown" },
};

export function computerDisplayName(level: Level, translatedLevel: string): string {
  return `${COMPUTER_OPPONENTS[level].name} (${translatedLevel})`;
}
