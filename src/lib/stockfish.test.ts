import { describe, it, expect, vi } from "vitest";
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
  it("terminates a timed-out search and reboots cleanly for the next move", async () => {
    vi.useFakeTimers();
    vi.resetModules();
    class FakeWorker {
      static instances: FakeWorker[] = [];
      static answer = false;
      onmessage: ((event: { data: string }) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      terminated = false;
      constructor(_url: string) { FakeWorker.instances.push(this); }
      postMessage(message: string) {
        if (message === "isready") queueMicrotask(() => this.onmessage?.({ data: "readyok" }));
        if (message.startsWith("go ") && FakeWorker.answer) queueMicrotask(() => this.onmessage?.({ data: "bestmove e2e4" }));
      }
      terminate() { this.terminated = true; }
    }
    vi.stubGlobal("Worker", FakeWorker);
    try {
      const { stockfishMove: isolatedMove, SF_CFG: isolatedCfg } = await import("./stockfish");
      const first = isolatedMove(new (await import("chess.js")).Chess().fen(), "medium");
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync((isolatedCfg.medium?.movetime ?? 0) + 4000);
      await expect(first).resolves.toBeNull();
      expect(FakeWorker.instances[0]?.terminated).toBe(true);

      FakeWorker.answer = true;
      const second = isolatedMove(new (await import("chess.js")).Chess().fen(), "medium");
      await vi.advanceTimersByTimeAsync(0);
      await expect(second).resolves.toBe("e2e4");
      expect(FakeWorker.instances).toHaveLength(2);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });
});
