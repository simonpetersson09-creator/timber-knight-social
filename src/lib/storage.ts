import { Chess } from "chess.js";
import type { Level } from "./engine";
import { isUnlocked } from "./progress";
import { LEVELS } from "./engine";

export type Color = "w" | "b";
export type ClockCfg = { minutes: number; inc: number } | null;
export const CLOCKS: ClockCfg[] = [null, { minutes: 3, inc: 2 }, { minutes: 5, inc: 0 }, { minutes: 10, inc: 0 }, { minutes: 15, inc: 10 }];
export const clockLabel = (c: ClockCfg) => (c ? `${c.minutes}+${c.inc}` : "");

export type SavedGame = {
  id: string; mode: "ai" | "local"; level: Level; human: Color; clock: ClockCfg;
  times: { w: number; b: number } | null; pgn: string; updatedAt: number;
};
export type Outcome = "win" | "loss" | "draw";
export type ResultStats = { played: number; wins: number; losses: number; draws: number };
export type Stats = {
  played: number; wins: number; losses: number; draws: number; streak: number; bestStreak: number;
  levelWins: Partial<Record<Level, number>>;
  byLevel: Partial<Record<Level, ResultStats>>;
  byMode: Partial<Record<"ai" | "local" | "online", ResultStats>>;
  recorded: string[];
};
export type Settings = { lang: string; sound: boolean; haptics: boolean };

export const MAX_SAVED = 3;
const G = "mrbchess.games.v1", S = "mrbchess.stats.v1", P = "mrbchess.settings.v1";
const EMPTY_RESULT: ResultStats = { played: 0, wins: 0, losses: 0, draws: 0 };
const EMPTY_STATS: Stats = { played: 0, wins: 0, losses: 0, draws: 0, streak: 0, bestStreak: 0, levelWins: {}, byLevel: {}, byMode: {}, recorded: [] };

function read<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
const write = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* full */ } };

export const listGames = () => read<SavedGame[]>(G, []).sort((a, b) => b.updatedAt - a.updatedAt);
export const getGame = (id: string) => listGames().find((g) => g.id === id) ?? null;
export function saveGame(g: SavedGame) { write(G, [...listGames().filter((x) => x.id !== g.id), { ...g, updatedAt: Date.now() }]); }
export function deleteGame(id: string) { write(G, listGames().filter((g) => g.id !== id)); }

export function createGame(cfg: { mode: "ai" | "local"; level: Level; human: Color; clock: ClockCfg }): SavedGame | null {
  if (listGames().length >= MAX_SAVED) return null;
  const ms = cfg.clock ? cfg.clock.minutes * 60_000 : 0;
  const g: SavedGame = { ...cfg, id: crypto.randomUUID(), times: cfg.clock ? { w: ms, b: ms } : null, pgn: "", updatedAt: Date.now() };
  saveGame(g);
  return g;
}

export function turnOf(pgn: string): Color {
  const c = new Chess();
  if (pgn) c.loadPgn(pgn);
  return c.turn();
}

export const getStats = (): Stats => ({ ...EMPTY_STATS, ...read<Partial<Stats>>(S, {}) });
export const resetStats = () => write(S, { ...EMPTY_STATS, levelWins: {}, byLevel: {}, byMode: {}, recorded: getStats().recorded });

function addResult(target: ResultStats | undefined, outcome: Outcome): ResultStats {
  const next = { ...EMPTY_RESULT, ...target, played: (target?.played ?? 0) + 1 };
  if (outcome === "win") next.wins++;
  else if (outcome === "loss") next.losses++;
  else next.draws++;
  return next;
}

/** Records a completed local game once, with detailed level and game-mode totals. */
export function recordResult(id: string, outcome: Outcome, level: Level | null, counts = true, mode: "ai" | "local" | "online" = "ai"): Level | null {
  if (!counts) return null;
  const s = getStats();
  if (s.recorded.includes(id)) return null;
  const before = LEVELS.filter((l) => isUnlocked(l, s.levelWins));
  s.played++;
  if (outcome === "win") { s.wins++; s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak); if (level) s.levelWins[level] = (s.levelWins[level] ?? 0) + 1; }
  else { s.streak = 0; if (outcome === "loss") s.losses++; else s.draws++; }
  if (level) s.byLevel = { ...s.byLevel, [level]: addResult(s.byLevel[level], outcome) };
  s.byMode = { ...s.byMode, [mode]: addResult(s.byMode[mode], outcome) };
  s.recorded = [...s.recorded, id];
  write(S, s);
  return LEVELS.find((l) => isUnlocked(l, s.levelWins) && !before.includes(l)) ?? null;
}

export const getSettings = (): Settings => ({ lang: "auto", sound: true, haptics: true, ...read<Partial<Settings>>(P, {}) });
export const saveSettings = (s: Settings) => write(P, s);
