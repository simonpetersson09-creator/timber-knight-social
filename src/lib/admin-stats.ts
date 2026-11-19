import type { AdminDayRow } from "./admin-records";

export type AdminPlayer = { id: string; created_at: string; platform: string };
export type AdminAppDay = { player: string; day: string; platform: string };
export type AdminEvent = { player: string | null; kind: string; name: string; platform: string; detail: string | null; created_at: string };
export type AdminMatch = { white: string; black: string; finished_at: string; game_id: string | null; counts: boolean };
export type AdminBestTimes = {
  weekday: { dow: number; avg_devices: number } | null;
  hour: { hour: number; devices: number } | null;
};

const PLAY_EVENTS = new Set(["local_game_started", "local_game_finished", "game_active", "game_finished", "move_committed"]);
const NATIVE = new Set(["ios", "android"]);

export function adminStockholmDay(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function stockholmHour(date: Date): number {
  return Number(new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", hour: "2-digit", hourCycle: "h23" }).format(date));
}

function weekday(day: string): number {
  return new Date(`${day}T12:00:00Z`).getUTCDay();
}

export function buildAdminStats(input: {
  players: AdminPlayer[];
  appDays: AdminAppDay[];
  events: AdminEvent[];
  matches: AdminMatch[];
  testIds: Set<string>;
  now?: Date;
  periodDays?: number;
}): { days: AdminDayRow[]; best: AdminBestTimes } {
  const now = input.now ?? new Date();
  const today = adminStockholmDay(now);
  const players = new Map(input.players.filter((p) => NATIVE.has(p.platform) && !input.testIds.has(p.id)).map((p) => [p.id, p]));
  const days = new Map<string, AdminDayRow>();
  for (let i = 0; i < (input.periodDays ?? 30); i++) {
    const day = adminStockholmDay(new Date(now.getTime() - i * 86_400_000));
    days.set(day, { day, devices: 0, ios: 0, android: 0, played: 0, avg_app_age_days: null, total: 0, cpu_finished: 0, online_finished: 0, forfeits: 0, issues: 0, issue_devices: 0, new_players: 0, returning_played: 0, post_match_shown: 0, post_match_opportunities: 0 });
  }
  const active = new Map<string, Set<string>>();
  const played = new Map<string, Set<string>>();
  const issueDevices = new Map<string, Set<string>>();
  const bump = (day: string, key: keyof AdminDayRow, amount = 1) => {
    const row = days.get(day);
    if (row) (row[key] as number) += amount;
  };
  for (const row of input.appDays) {
    if (!days.has(row.day) || !NATIVE.has(row.platform) || !players.has(row.player)) continue;
    if (!active.has(row.day)) active.set(row.day, new Set());
    active.get(row.day)!.add(row.player);
  }
  for (const [day, ids] of active) {
    const row = days.get(day)!;
    for (const id of ids) {
      const player = players.get(id)!;
      if (player.platform === "ios" || player.platform === "android") row[player.platform]++;
      row.devices++;
    }
    const ages = [...ids].map((id) => Math.max(0, (Date.parse(`${day}T12:00:00Z`) - Date.parse(players.get(id)!.created_at)) / 86_400_000));
    row.avg_app_age_days = ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : null;
  }
  for (const player of players.values()) {
    const day = adminStockholmDay(new Date(player.created_at));
    if (days.has(day)) bump(day, "new_players");
  }
  const hourly = new Map<number, Set<string>>();
  const weekdayDaily = new Map<number, Map<string, Set<string>>>();
  for (const event of input.events) {
    if (!NATIVE.has(event.platform) || !event.player || !players.has(event.player)) continue;
    const date = new Date(event.created_at), day = adminStockholmDay(date);
    if (!days.has(day)) {
      if (PLAY_EVENTS.has(event.name)) {
        const hour = stockholmHour(date);
        if (!hourly.has(hour)) hourly.set(hour, new Set());
        hourly.get(hour)!.add(event.player);
        const dow = weekday(day);
        if (!weekdayDaily.has(dow)) weekdayDaily.set(dow, new Map());
        const byDay = weekdayDaily.get(dow)!;
        if (!byDay.has(day)) byDay.set(day, new Set());
        byDay.get(day)!.add(event.player);
      }
      continue;
    }
    if (PLAY_EVENTS.has(event.name)) {
      if (!played.has(day)) played.set(day, new Set());
      played.get(day)!.add(event.player);
      const hour = stockholmHour(date);
      if (!hourly.has(hour)) hourly.set(hour, new Set());
      hourly.get(hour)!.add(event.player);
      const dow = weekday(day);
      if (!weekdayDaily.has(dow)) weekdayDaily.set(dow, new Map());
      const byDay = weekdayDaily.get(dow)!;
      if (!byDay.has(day)) byDay.set(day, new Set());
      byDay.get(day)!.add(event.player);
    }
    if (event.name === "local_game_finished") bump(day, "cpu_finished");
    if (event.kind === "error") {
      bump(day, "issues");
      if (!issueDevices.has(day)) issueDevices.set(day, new Set());
      issueDevices.get(day)!.add(event.player);
    }
    if (event.name === "interstitial_shown") bump(day, "post_match_shown");
    if (event.name === "interstitial_opportunity") bump(day, "post_match_opportunities");
  }
  for (const [day, ids] of played) days.get(day)!.played = ids.size;
  for (const [day, ids] of issueDevices) days.get(day)!.issue_devices = ids.size;
  for (const [day, row] of days) {
    const previous = adminStockholmDay(new Date(Date.parse(`${day}T12:00:00Z`) - 86_400_000));
    const before = played.get(previous), current = played.get(day);
    row.returning_played = current && before ? [...current].filter((id) => before.has(id)).length : 0;
  }
  for (const match of input.matches) {
    if (!match.game_id || input.testIds.has(match.white) || input.testIds.has(match.black)) continue;
    const day = adminStockholmDay(new Date(match.finished_at));
    if (!days.has(day)) continue;
    bump(day, match.counts ? "online_finished" : "forfeits");
  }
  const ordered = [...days.values()].sort((a, b) => b.day.localeCompare(a.day));
  for (const row of ordered) row.total = row.cpu_finished + row.online_finished;
  const weekdays = [...weekdayDaily].map(([dow, byDay]) => {
    const counts = [...byDay.values()].map((ids) => ids.size);
    return { dow, avg_devices: counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0 };
  }).sort((a, b) => b.avg_devices - a.avg_devices);
  const hours = [...hourly].map(([hour, ids]) => ({ hour, devices: ids.size })).sort((a, b) => b.devices - a.devices);
  return { days: ordered, best: { weekday: weekdays[0] ?? null, hour: hours[0] ?? null } };
}
