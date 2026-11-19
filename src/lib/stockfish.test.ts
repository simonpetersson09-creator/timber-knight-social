import { describe, it, expect } from "vitest";
import { SF_CFG } from "./stockfish";

describe("computer levels", () => {
  it("Proffs plays at full Stockfish strength", () => {
    expect(SF_CFG.master?.options["Skill Level"]).toBe(20);
    expect(SF_CFG.master?.options["UCI_LimitStrength"]).toBe("false");
  });
  it("each level is stronger than the one below", () => {
    const skill = (l: "medium" | "hard" | "master") => Number(SF_CFG[l]?.options["Skill Level"]);
    expect(skill("medium")).toBeLessThan(skill("hard"));
    expect(skill("hard")).toBeLessThan(skill("master"));
  });
});
