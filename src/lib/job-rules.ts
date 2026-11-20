export const HOURLY_JOB_BUDGET_MS = 45_000;
export const HOURLY_JOB_LEASE_SECONDS = 120;

/** A zero-change run is explicitly a noop; an exhausted budget is never presented as complete. */
export function hourlyJobOutcome(swept: number, reminders: number, truncated: boolean, cleaned = 0) {
  const changed = swept + reminders + cleaned;
  return {
    result: truncated ? "partial" as const : changed > 0 ? "updated" as const : "noop" as const,
    changed,
    swept,
    reminders,
    cleaned,
    truncated,
  };
}
