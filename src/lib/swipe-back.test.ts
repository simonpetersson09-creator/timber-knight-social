import { describe, expect, it } from "vitest";
import { isBackSwipe } from "./swipe-back";

describe("swipe back", () => {
  it("accepts a left-to-right edge swipe", () => {
    expect(isBackSwipe({ x: 12, y: 250 }, { x: 140, y: 260 })).toBe(true);
  });
  it("does not treat board gestures as navigation", () => {
    expect(isBackSwipe({ x: 100, y: 250 }, { x: 240, y: 250 })).toBe(false);
  });
  it("ignores vertical scrolling, short movements and reverse swipes", () => {
    expect(isBackSwipe({ x: 12, y: 250 }, { x: 100, y: 400 })).toBe(false);
    expect(isBackSwipe({ x: 12, y: 250 }, { x: 40, y: 250 })).toBe(false);
    expect(isBackSwipe({ x: 12, y: 250 }, { x: 0, y: 250 })).toBe(false);
  });
});