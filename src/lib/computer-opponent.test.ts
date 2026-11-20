import { describe, expect, it } from "vitest";
import { COMPUTER_OPPONENTS, computerDisplayName } from "./computer-opponent";

const quickLevels = ["beginner", "medium", "hard", "master"] as const;

describe("computer opponents", () => {
  it("uses four different neutral names for the quick-play levels", () => {
    expect(quickLevels.map((level) => COMPUTER_OPPONENTS[level].name)).toEqual(["Noa", "Alva", "Kim", "Sam"]);
    expect(new Set(quickLevels.map((level) => COMPUTER_OPPONENTS[level].name)).size).toBe(4);
  });

  it("uses an increasingly advanced chess symbol for each quick-play level", () => {
    expect(quickLevels.map((level) => COMPUTER_OPPONENTS[level].icon)).toEqual(["pawn", "knight", "bishop", "crown"]);
    expect(new Set(quickLevels.map((level) => COMPUTER_OPPONENTS[level].icon)).size).toBe(4);
  });

  it("shows the neutral name followed by the difficulty in parentheses", () => {
    expect(computerDisplayName("hard", "Svår")).toBe("Kim (Svår)");
  });
});
