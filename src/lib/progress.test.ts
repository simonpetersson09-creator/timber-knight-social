import { describe, expect, it } from "vitest";
import { isUnlocked } from "./progress";

describe("level unlocks", () => {
  it("beginner and easy are open from the start", () => {
    expect(isUnlocked("beginner", {})).toBe(true);
    expect(isUnlocked("easy", {})).toBe(true);
  });
  it("medium needs 2 wins on easy", () => {
    expect(isUnlocked("medium", { easy: 1 })).toBe(false);
    expect(isUnlocked("medium", { easy: 2 })).toBe(true);
  });
  it("master needs 5 wins on expert", () => {
    expect(isUnlocked("master", { expert: 4 })).toBe(false);
    expect(isUnlocked("master", { expert: 5 })).toBe(true);
  });
});
