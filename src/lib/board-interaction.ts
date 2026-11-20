import type { Square } from "chess.js";

const FILES = "abcdefgh";

export const PROMOTION_CHOICES = ["q", "r", "b", "n"] as const;
export type PromotionChoice = (typeof PROMOTION_CHOICES)[number];

export type BoardPoint = { x: number; y: number };
export type BoardRect = { left: number; top: number; width: number; height: number };

/** Converts a pointer's viewport position to a board square, respecting board orientation. */
export function squareAtPoint(
  point: BoardPoint,
  rect: BoardRect,
  orientation: "w" | "b",
): Square | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const column = Math.floor(((point.x - rect.left) / rect.width) * 8);
  const row = Math.floor(((point.y - rect.top) / rect.height) * 8);
  if (column < 0 || column > 7 || row < 0 || row > 7) return null;
  const file = orientation === "w" ? column : 7 - column;
  const rank = orientation === "w" ? 8 - row : row + 1;
  return `${FILES[file]}${rank}` as Square;
}
