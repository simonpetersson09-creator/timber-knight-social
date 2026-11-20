export type SwipePoint = { x: number; y: number };

/** Only edge gestures count; normal board touches and vertical scrolling stay untouched. */
export function isBackSwipe(start: SwipePoint, end: SwipePoint): boolean {
  const dx = end.x - start.x;
  return start.x <= 28 && dx >= 70 && Math.abs(end.y - start.y) <= dx / 2;
}