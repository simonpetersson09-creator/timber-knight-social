import type { AdminAppDay, AdminPlayer } from "./admin-stats";
import { adminStockholmDay } from "./admin-stats";

export type RetentionValue = { returned: number; eligible: number; rate: number | null };
export type RetentionStats = { d1: RetentionValue; d7: RetentionValue; d30: RetentionValue };

function addDays(day: string, amount: number): string {
  return adminStockholmDay(new Date(Date.parse(`${day}T12:00:00Z`) + amount * 86_400_000));
}

/** Exact native cohort retention: activity on day N after the player's first registered day. */
export function buildRetention(players: AdminPlayer[], appDays: AdminAppDay[], testIds: Set<string>, now = new Date()): RetentionStats {
  const today = adminStockholmDay(now);
  const active = new Set(appDays.filter((row) => row.platform === "ios" || row.platform === "android").map((row) => `${row.player}:${row.day}`));
  const cohort = players.filter((player) => (player.platform === "ios" || player.platform === "android") && !testIds.has(player.id) && !player.deleted_at)
    .map((player) => ({ id: player.id, day: adminStockholmDay(new Date(player.created_at)) }))
    .filter((player) => player.day <= today);
  const value = (offset: number): RetentionValue => {
    const eligible = cohort.filter((player) => addDays(player.day, offset) <= today);
    const returned = eligible.filter((player) => active.has(`${player.id}:${addDays(player.day, offset)}`)).length;
    return { returned, eligible: eligible.length, rate: eligible.length ? returned / eligible.length * 100 : null };
  };
  return { d1: value(1), d7: value(7), d30: value(30) };
}
