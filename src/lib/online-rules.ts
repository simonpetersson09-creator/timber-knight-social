// Pure rules for online play, reminders, ads and rating prompts (unit-tested).
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
export const INVITE_TTL_MS = 24 * HOUR;
export const LOBBY_TTL_MS = 6 * HOUR;
export const MOVE_LIMIT_MS = 48 * HOUR;
export const MOVE_REMIND_MS = 24 * HOUR;
export const QUICK_WAIT_MS = 20_000;
export const REMINDER_DAYS = 7;
export const REMINDER_HOUR = 18;
export const RATE_AT = [5, 15, 35] as const; // after 5, then +10, then +20 — max 3 asks

export type MatchRow = { white: string; black: string; result: "w" | "b" | "d"; counts: boolean; finished_at: string };
export type OnlineStats = { played: number; wins: number; losses: number; draws: number; winRate: number; streak: number };

/** A finished, decisive/drawn result counts; resignations and closed games never do. */
export function onlineGameCountsForStats(game: { status: string; result: string | null; end_reason: string | null }): boolean {
  return game.status === "finished" && ["w", "b", "d"].includes(game.result ?? "") && game.end_reason !== "resign";
}

/** Invalidates old polling responses across optimistic moves, cleanup and match changes. */
export function createOnlineReadGuard() {
  let sequence = 0;
  let active = true;
  let blocked = false;
  return {
    activate() { active = true; sequence++; },
    dispose() { active = false; sequence++; },
    invalidate() { sequence++; },
    block() { blocked = true; sequence++; },
    unblock() { blocked = false; sequence++; },
    get active() { return active; },
    get blocked() { return blocked; },
    begin(): number | null { return active && !blocked ? ++sequence : null; },
    accepts(ticket: number): boolean { return active && !blocked && ticket === sequence; },
  };
}

export type ClosableGame = { status: string; host: string; invitee: string | null; white: string | null; black: string | null };
/** Only participants may remove an unfinished game; completed history is never deleted here. */
export function canCloseOnlineGame(game: ClosableGame, me: string): boolean {
  if (game.status !== "waiting" && game.status !== "active") return false;
  return [game.host, game.invitee, game.white, game.black].includes(me);
}

/** Resigned games (counts=false) never affect statistics. Rows newest first. */
export function statsFor(me: string, rows: MatchRow[]): OnlineStats {
  const own = rows.filter((r) => r.counts && (r.white === me || r.black === me));
  const res = own.map((r) => (r.result === "d" ? "d" : (r.result === "w") === (r.white === me) ? "w" : "l"));
  let streak = 0;
  for (const r of res) { if (r === "w") streak++; else break; }
  const wins = res.filter((r) => r === "w").length;
  return { played: res.length, wins, losses: res.filter((r) => r === "l").length, draws: res.filter((r) => r === "d").length, winRate: res.length ? Math.round((wins / res.length) * 100) : 0, streak };
}

/** Player whose move timed out loses; reminder once halfway. */
export function moveDeadline(lastMoveAt: number, now: number): "ok" | "remind" | "timeout" {
  const idle = now - lastMoveAt;
  return idle >= MOVE_LIMIT_MS ? "timeout" : idle >= MOVE_REMIND_MS ? "remind" : "ok";
}

export function localHour(tz: string | null, now: Date): number {
  try { return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: tz ?? "Europe/Stockholm" }).format(now)); }
  catch { return now.getUTCHours(); }
}

/** 7 days without playing → one reminder at 18:00 local time, at most once a week. */
export function shouldSendPlayReminder(p: { last_played: string | null; last_reminder: string | null; tz: string | null; created_at: string }, now: Date): boolean {
  const since = new Date(p.last_played ?? p.created_at).getTime();
  if (now.getTime() - since < REMINDER_DAYS * DAY) return false;
  if (p.last_reminder && now.getTime() - new Date(p.last_reminder).getTime() < REMINDER_DAYS * DAY - HOUR) return false;
  return localHour(p.tz, now) === REMINDER_HOUR;
}

export function shouldAskRating(finished: number, asked: number): boolean {
  return asked < RATE_AT.length && finished >= RATE_AT[asked]!;
}

/** Starts the next poll only after the previous request has settled. */
export function startSequentialPolling(task: () => Promise<void>, delayMs = 2000): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const run = async () => {
    try { await task(); } catch { /* a later poll can retry */ }
    if (!stopped) timer = setTimeout(() => { void run(); }, delayMs);
  };
  void run();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

/** Web visitors only see the download page – except joining, rules, legal and admin pages. */
export function webPathAllowed(path: string): boolean {
  return ["/join", "/legal", "/rules", "/admin", "/add"].some((p) => path === p || path.startsWith(p + "/"));
}
