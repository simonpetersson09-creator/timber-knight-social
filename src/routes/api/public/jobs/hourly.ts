import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { HOURLY_JOB_BUDGET_MS, HOURLY_JOB_LEASE_SECONDS, hourlyJobOutcome } from "@/lib/job-rules";
import { shouldSendPlayReminder } from "@/lib/online-rules";
import { db, deliverPushBatch, notify, sweepGames } from "@/lib/server/core";

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
const PAGE_SIZE = 250;

// Hourly: one bounded worker forfeits idle games and sends due reminders.
export const Route = createFileRoute("/api/public/jobs/hourly")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const a = await db();
        const owner = crypto.randomUUID();
        const { data: claimed, error: claimError } = await a.rpc("claim_chess_job", {
          p_job: "hourly",
          p_owner: owner,
          p_lease_seconds: HOURLY_JOB_LEASE_SECONDS,
        });
        if (claimError) throw new Error("job_lock_failed");
        if (!claimed) return Response.json({ result: "already_running" }, { status: 409 });

        const deadline = Date.now() + HOURLY_JOB_BUDGET_MS;
        let swept = 0;
        let sent = 0;
        let truncated = false;
        try {
          // Bound the ad-hoc quota store; all configured windows/blocks are at most one day.
          const { data: cleanupRows, error: cleanupError } = await a.from("abuse_limits").delete().lt("window_started_at", new Date(Date.now() - 2 * 86_400_000).toISOString()).select("action");
          if (cleanupError) throw new Error("quota_cleanup_failed");
          const cleaned = cleanupRows?.length ?? 0;

          let cursor = ZERO_UUID;
          while (Date.now() < deadline) {
            const { data: games, error } = await a.from("games").select("id, kind, status, host, white, black, fen, last_move_at, reminded, expires_at").in("status", ["waiting", "active"]).gt("id", cursor).order("id").limit(PAGE_SIZE);
            if (error) throw new Error("game_sweep_read_failed");
            swept += await sweepGames(a, games ?? [], deadline);
            const last = games?.[games.length - 1];
            if (!last || !games || games.length < PAGE_SIZE) break;
            cursor = last.id;
          }
          if (Date.now() >= deadline) truncated = true;

          const now = new Date();
          const cutoff = new Date(now.getTime() - 7 * 864e5).toISOString();
          let reminderCursor = ZERO_UUID;
          while (!truncated && Date.now() < deadline) {
            const { data: idle, error } = await a.from("players").select("id, last_played, last_reminder, tz, created_at")
              .is("deleted_at", null).not("push_token", "is", null).eq("notify", true).eq("notify_play", true).or(`last_played.lt.${cutoff},and(last_played.is.null,created_at.lt.${cutoff})`).gt("id", reminderCursor).order("id").limit(PAGE_SIZE);
            if (error) throw new Error("reminder_read_failed");
            for (const p of idle ?? []) {
              if (Date.now() >= deadline) { truncated = true; break; }
              if (!shouldSendPlayReminder(p, now)) continue;
              let update = a.from("players").update({ last_reminder: now.toISOString() }).eq("id", p.id).is("deleted_at", null);
              update = p.last_reminder ? update.eq("last_reminder", p.last_reminder) : update.is("last_reminder", null);
              const { data: marked, error: markError } = await update.select("id");
              if (markError) throw new Error("reminder_update_failed");
              if (!marked?.length) continue;
              sent++;
              await notify(a, p.id, "pushPlayReminder", {}, {}, deadline);
            }
            const last = idle?.[idle.length - 1];
            if (!last || !idle || idle.length < PAGE_SIZE) break;
            reminderCursor = last.id;
          }
          if (Date.now() >= deadline) truncated = true;
          await deliverPushBatch(a, deadline);
          return Response.json(hourlyJobOutcome(swept, sent, truncated, cleaned));
        } finally {
          const { error } = await a.rpc("release_chess_job", { p_job: "hourly", p_owner: owner });
          if (error) console.error("Hourly job lock release failed");
        }
      },
    },
  },
});
