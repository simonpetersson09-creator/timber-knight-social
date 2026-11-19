import { describe, it, expect } from "vitest";
import { SF_CFG } from "./stockfish";
import { LOCAL_LEVEL_CFG } from "./engine";

describe("computer levels", () => {
  it("Proffs plays at full Stockfish strength", () => {
    expect(SF_CFG.master?.options["Skill Level"]).toBe(20);
    expect(SF_CFG.master?.options["UCI_LimitStrength"]).toBe("false");
    expect(SF_CFG.master?.depth).toBe(20);
  });
  it("each level is stronger than the one below", () => {
    const skill = (l: "medium" | "hard" | "master") => Number(SF_CFG[l]?.options["Skill Level"]);
    expect(skill("medium")).toBeLessThan(skill("hard"));
    expect(skill("hard")).toBeLessThan(skill("master"));
  });
  it("Nybörjare looks one reply ahead and makes fewer random moves", () => {
    expect(LOCAL_LEVEL_CFG.beginner.depth).toBe(2);
    expect(LOCAL_LEVEL_CFG.beginner.random).toBe(0.25);
  });
  it("Medel and Svår use safer settings without reaching Proffs strength", () => {
    expect(SF_CFG.medium?.options["Skill Level"]).toBe(7);
    expect(SF_CFG.hard?.options["Skill Level"]).toBe(12);
    expect(SF_CFG.master?.options["Skill Level"]).toBe(20);
  });
});
