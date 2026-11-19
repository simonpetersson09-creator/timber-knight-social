import wasm from "@/assets/stockfish-wasm.asset.json";
import type { Level } from "./engine";

/** UCI settings per level. Beginner stays on the light local engine (see engine.ts). */
export const SF_CFG: Partial<Record<Level, { options: Record<string, string | number>; movetime: number }>> = {
  medium: { options: { "Skill Level": 0, UCI_LimitStrength: "false" }, movetime: 150 },
  hard: { options: { "Skill Level": 10, UCI_LimitStrength: "false" }, movetime: 500 },
  expert: { options: { "Skill Level": 15, UCI_LimitStrength: "false" }, movetime: 1000 },
  master: { options: { "Skill Level": 20, UCI_LimitStrength: "false" }, movetime: 2500 },
};

let worker: Worker | null = null;
let ready: Promise<Worker> | null = null;

function boot(): Promise<Worker> {
  if (ready) return ready;
  ready = new Promise<Worker>((resolve, reject) => {
    const w = new Worker(`/engine/stockfish.js#${encodeURIComponent(location.origin + wasm.url)}`);
    const t = setTimeout(() => reject(new Error("stockfish timeout")), 15000);
    w.onerror = (e) => { clearTimeout(t); reject(e); };
    w.onmessage = (e) => { if (e.data === "readyok") { clearTimeout(t); worker = w; resolve(w); } };
    w.postMessage("uci"); w.postMessage("setoption name Hash value 32"); w.postMessage("isready");
  });
  ready.catch(() => { ready = null; });
  return ready;
}

/** Warm the engine early so the first computer move isn't delayed. */
export function preloadStockfish() { if (typeof Worker !== "undefined") boot().catch(() => {}); }

let queue: Promise<unknown> = Promise.resolve();

/** Best move in UCI form ("e2e4", "e7e8q") or null if the engine is unavailable. */
export function stockfishMove(fen: string, level: Level): Promise<string | null> {
  const cfg = SF_CFG[level];
  if (!cfg || typeof Worker === "undefined") return Promise.resolve(null);
  const run = queue.then(async () => {
    const w = await boot();
    return new Promise<string | null>((resolve) => {
      const t = setTimeout(() => { w.postMessage("stop"); }, cfg.movetime + 4000);
      w.onmessage = (e) => {
        const line = String(e.data);
        if (line.startsWith("bestmove")) { clearTimeout(t); const m = line.split(" ")[1]; resolve(m && m !== "(none)" ? m : null); }
      };
      for (const [k, v] of Object.entries(cfg.options)) w.postMessage(`setoption name ${k} value ${v}`);
      w.postMessage("ucinewgame");
      w.postMessage(`position fen ${fen}`);
      w.postMessage(`go movetime ${cfg.movetime}`);
    });
  }).catch(() => null);
  queue = run;
  return run;
}
