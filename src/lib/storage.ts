import { Chess } from "chess.js";
import type { Level } from "./engine";
import { LEVELS } from "./engine";

export type Color = "w" | "b";
export type ClockCfg = { minutes: number; inc: number } | null;
export const CLOCKS: ClockCfg[] = [null, { minutes: 3, inc: 2 }, { minutes: 5, inc: 0 }, { minutes: 10, inc: 0 }, { minutes: 15, inc: 10 }];
export const clockLabel = (c: ClockCfg) => (c ? `${c.minutes}+${c.inc}` : "");

export type GameConfig = { mode: "ai" | "local"; level: Level; human: Color; clock: ClockCfg };
export type SavedGame = GameConfig & {
  id: string;
  /** Epoch anchor; null while explicitly paused. Missing anchors migrate to paused. */
  clockStartedAt?: number | null;
  times: { w: number; b: number } | null; pgn: string; updatedAt: number;
  /** Confirmed offers per colour; older saves fall back to zero when opened. */
  drawOffers: Record<Color, number>;
  /** Kept with the final position until statistics have been stored successfully. */
  completion: GameCompletion | null;
};
export type Outcome = "win" | "loss" | "draw";
export type GameCompletion = { winner: Color | null; reason: "checkmate" | "timeout" | "resigned" | "draw" };
export type ResultStats = { played: number; wins: number; losses: number; draws: number };
export type Stats = ResultStats & {
  streak: number; bestStreak: number;
  byLevel: Partial<Record<Level, ResultStats>>;
  byMode: Partial<Record<"ai" | "local" | "online", ResultStats>>;
  recorded: string[];
};
export type Settings = { lang: string; sound: boolean; haptics: boolean };

export const MAX_SAVED = 3;
const G = "mrbchess.games.v1", S = "mrbchess.stats.v1", P = "mrbchess.settings.v1";
const EMPTY_RESULT: ResultStats = { played: 0, wins: 0, losses: 0, draws: 0 };
const emptyStats = (): Stats => ({ played: 0, wins: 0, losses: 0, draws: 0, streak: 0, bestStreak: 0, byLevel: {}, byMode: {}, recorded: [] });
export const STATS_CHANGED = "mrbchess:stats-changed";

function read<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
const write = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)); if (key === S) window.dispatchEvent(new Event(STATS_CHANGED)); } catch { /* full */ } };

const object = (v: unknown): Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const count = (v: unknown): number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : 0;
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

/** Validate before any PGN consumer or result recorder sees a saved game. */
export function validatedGame(value: unknown): SavedGame | null {
  const v = object(value), clock = object(v["clock"]), times = object(v["times"]);
  if (typeof v["id"] !== "string" || !v["id"].trim() || typeof v["pgn"] !== "string" ||
      !["ai", "local"].includes(v["mode"] as string) || !LEVELS.includes(v["level"] as Level) ||
      !["w", "b"].includes(v["human"] as string) || !finite(v["updatedAt"])) return null;
  if (v["clock"] !== null && (!finite(clock["minutes"]) || clock["minutes"] <= 0 || !finite(clock["inc"]) || !finite(times["w"]) || !finite(times["b"]))) return null;
  if (v["clockStartedAt"] !== undefined && v["clockStartedAt"] !== null && !finite(v["clockStartedAt"])) return null;
  try { const chess = new Chess(); if (v["pgn"]) chess.loadPgn(v["pgn"]); } catch { return null; }
  const offers = object(v["drawOffers"]);
  const rawCompletion = v["completion"], completion = object(rawCompletion);
  if (rawCompletion != null && (!(completion["winner"] === null || ["w", "b"].includes(completion["winner"] as string)) ||
      !["checkmate", "timeout", "resigned", "draw"].includes(completion["reason"] as string))) return null;
  return {
    id: v["id"], mode: v["mode"] as GameConfig["mode"], level: v["level"] as Level, human: v["human"] as Color,
    pgn: v["pgn"], updatedAt: v["updatedAt"],
    clock: v["clock"] === null ? null : { minutes: clock["minutes"] as number, inc: clock["inc"] as number },
    times: v["clock"] === null ? null : { w: times["w"] as number, b: times["b"] as number },
    clockStartedAt: v["clockStartedAt"] == null ? null : v["clockStartedAt"] as number,
    drawOffers: { w: Math.min(2, count(offers["w"])), b: Math.min(2, count(offers["b"])) },
    completion: rawCompletion == null ? null : { winner: completion["winner"] as Color | null, reason: completion["reason"] as GameCompletion["reason"] },
  };
}

export function listGames(): SavedGame[] {
  const raw = read<unknown>(G, []);
  const seen = new Set<string>();
  const games = (Array.isArray(raw) ? raw : []).map(validatedGame).filter((g): g is SavedGame => g !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt).filter((g) => !seen.has(g.id) && !!seen.add(g.id)).slice(0, MAX_SAVED);
  if (JSON.stringify(raw) !== JSON.stringify(games)) write(G, games);
  return games;
}
export const getGame = (id: string) => listGames().find((g) => g.id === id) ?? null;
export function saveGame(value: SavedGame) {
  const g = validatedGame(value);
  if (!g) return;
  const games = listGames().filter((x) => x.id !== g.id);
  if (games.length >= MAX_SAVED) return;
  write(G, [{ ...g, updatedAt: Date.now() }, ...games]);
}
export function deleteGame(id: string) { write(G, listGames().filter((g) => g.id !== id)); }

/** One timestamp for debit and anchor: repeated checkpoints never refund or double-charge. */
export function checkpointClock(game: SavedGame, turn: Color, now: number, running: boolean): SavedGame {
  if (!game.times) return game;
  const elapsed = game.clockStartedAt == null ? 0 : Math.max(0, now - game.clockStartedAt);
  return { ...game, times: { ...game.times, [turn]: Math.max(0, game.times[turn] - elapsed) }, clockStartedAt: running ? now : null };
}

export function rematchConfig(game: GameConfig): GameConfig {
  return { mode: game.mode, level: game.level, human: game.human, clock: game.clock ? { ...game.clock } : null };
}

export function createGame(cfg: GameConfig): SavedGame | null {
  if (listGames().length >= MAX_SAVED) return null;
  const ms = cfg.clock ? cfg.clock.minutes * 60_000 : 0;
  const g: SavedGame = { ...cfg, id: crypto.randomUUID(), times: cfg.clock ? { w: ms, b: ms } : null, pgn: "", updatedAt: Date.now(), drawOffers: { w: 0, b: 0 }, completion: null };
  saveGame(g);
  return g;
}

export function turnOf(pgn: string): Color {
  const c = new Chess();
  try { if (pgn) c.loadPgn(pgn); } catch { return "w"; }
  return c.turn();
}

function resultStats(value: unknown): ResultStats {
  const v = object(value), wins = count(v["wins"]), losses = count(v["losses"]), draws = count(v["draws"]);
  return { wins, losses, draws, played: Math.max(count(v["played"]), wins + losses + draws) };
}
export function getStats(): Stats {
  const v = object(read<unknown>(S, {}));
  const s: Stats = { ...emptyStats(), ...resultStats(v), streak: count(v["streak"]), bestStreak: count(v["bestStreak"]) };
  s.bestStreak = Math.max(s.bestStreak, s.streak);
  for (const level of LEVELS) if (object(v["byLevel"])[level] !== undefined) s.byLevel[level] = resultStats(object(v["byLevel"])[level]);
  for (const mode of ["ai", "local", "online"] as const) if (object(v["byMode"])[mode] !== undefined) s.byMode[mode] = resultStats(object(v["byMode"])[mode]);
  s.recorded = [...new Set(Array.isArray(v["recorded"]) ? v["recorded"].filter((id): id is string => typeof id === "string" && !!id.trim()) : [])];
  return s;
}
export const resetStats = () => write(S, { ...emptyStats(), recorded: getStats().recorded });

function addResult(target: ResultStats | undefined, outcome: Outcome): ResultStats {
  const next = { ...EMPTY_RESULT, ...target, played: (target?.played ?? 0) + 1 };
  if (outcome === "win") next.wins++;
  else if (outcome === "loss") next.losses++;
  else next.draws++;
  return next;
}

/** Records a completed game once, with detailed level and game-mode totals. */
export function recordResult(id: string, outcome: Outcome, level: Level | null, counts = true, mode: "ai" | "local" | "online" = "ai"): void {
  if (!counts) return;
  const s = getStats();
  if (s.recorded.includes(id)) return;
  s.played++;
  if (outcome === "win") { s.wins++; s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak); }
  else { s.streak = 0; if (outcome === "loss") s.losses++; else s.draws++; }
  if (level) s.byLevel = { ...s.byLevel, [level]: addResult(s.byLevel[level], outcome) };
  s.byMode = { ...s.byMode, [mode]: addResult(s.byMode[mode], outcome) };
  s.recorded = [...s.recorded, id];
  write(S, s);
}

/** Records a final result before removing its recoverable saved position. */
export function completeSavedGame(game: SavedGame, outcome: Outcome, counts: boolean): { stored: boolean } {
  const valid = validatedGame(game);
  if (!valid) { if (game && typeof game.id === "string") deleteGame(game.id); return { stored: false }; }
  recordResult(valid.id, outcome, valid.level, counts, valid.mode);
  const stored = !counts || getStats().recorded.includes(valid.id);
  if (stored) deleteGame(valid.id);
  return { stored };
}

export const getSettings = (): Settings => ({ lang: "auto", sound: true, haptics: true, ...read<Partial<Settings>>(P, {}) });
export const saveSettings = (s: Settings) => write(P, s);
