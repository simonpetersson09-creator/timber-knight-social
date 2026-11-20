import wasm from "@/assets/stockfish-wasm.asset.json";
import type { Level } from "./engine";

/** UCI settings per level. Beginner stays on the light local engine (see engine.ts). */
export const SF_CFG: Partial<Record<Level, { options: Record<string, string | number>; movetime: number; depth?: number }>> = {
  medium: { options: { "Skill Level": 7, UCI_LimitStrength: "false" }, movetime: 350 },
  hard: { options: { "Skill Level": 12, UCI_LimitStrength: "false" }, movetime: 650 },
  expert: { options: { "Skill Level": 17, UCI_LimitStrength: "false" }, movetime: 1200 },
  master: { options: { "Skill Level": 20, UCI_LimitStrength: "false" }, movetime: 15000, depth: 20 },
};

let worker: Worker | null = null;
let ready: Promise<Worker> | null = null;

function discard(w: Worker) {
  w.onmessage = null;
  w.onerror = null;
  w.terminate();
  if (worker === w) worker = null;
  ready = null;
}

function boot(): Promise<Worker> {
  if (ready) return ready;
  const promise = new Promise<Worker>((resolve, reject) => {
    const w = new Worker(`/engine/stockfish.js#${encodeURIComponent(location.origin + wasm.url)}`);
    let settled = false;
    const fail = (reason: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      discard(w);
      reject(reason instanceof Error ? reason : new Error("stockfish unavailable"));
    };
    const timer = setTimeout(() => fail(new Error("stockfish timeout")), 15000);
    w.onerror = fail;
    w.onmessage = (event) => {
      if (event.data !== "readyok" || settled) return;
      settled = true;
      clearTimeout(timer);
      worker = w;
      resolve(w);
    };
    try {
      w.postMessage("uci");
      w.postMessage("setoption name Hash value 32");
      w.postMessage("isready");
    } catch (error) { fail(error); }
  });
  ready = promise;
  promise.catch(() => { if (ready === promise) ready = null; });
  return promise;
}

/** Warm the engine early so the first computer move isn't delayed. */
export function preloadStockfish() { if (typeof Worker !== "undefined") boot().catch(() => {}); }

let queue: Promise<unknown> = Promise.resolve();

/** Best move in UCI form, or null after a fully cleaned-up engine failure/timeout. */
export function stockfishMove(fen: string, level: Level): Promise<string | null> {
  const cfg = SF_CFG[level];
  if (!cfg || typeof Worker === "undefined") return Promise.resolve(null);
  const run = queue.then(async () => {
    const w = await boot();
    return new Promise<string | null>((resolve) => {
      let settled = false;
      const finish = (move: string | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        w.onmessage = null;
        w.onerror = null;
        resolve(move);
      };
      const fail = () => { discard(w); finish(null); };
      const timer = setTimeout(fail, cfg.movetime + 4000);
      w.onerror = fail;
      w.onmessage = (event) => {
        const line = String(event.data);
        if (!line.startsWith("bestmove")) return;
        const move = line.split(" ")[1];
        finish(move && move !== "(none)" ? move : null);
      };
      try {
        for (const [key, value] of Object.entries(cfg.options)) w.postMessage(`setoption name ${key} value ${value}`);
        w.postMessage("ucinewgame");
        w.postMessage(`position fen ${fen}`);
        w.postMessage(cfg.depth ? `go depth ${cfg.depth}` : `go movetime ${cfg.movetime}`);
      } catch { fail(); }
    });
  }).catch(() => null);
  queue = run;
  return run;
}
