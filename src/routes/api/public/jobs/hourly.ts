import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { shouldSendPlayReminder } from "@/lib/online-rules";
import { db, notify, sweepGames } from "@/lib/server/core";

// Hourly: forfeits idle online games, sends move reminders and the 7-day play reminder (18:00 local).
export const Route = createFileRoute("/api/public/jobs/hourly")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const a = await db();
        // Bound the ad-hoc quota store; all configured windows/blocks are at most one day.
        await a.from("abuse_limits").delete().lt("window_started_at", new Date(Date.now() - 2 * 86_400_000).toISOString());
        let swept = 0;
        let cursor = "00000000-0000-0000-0000-000000000000";
        for (;;) {
          const { data: games, error } = await a.from("games").select("id, kind, status, host, white, black, fen, last_move_at, reminded, expires_at").in("status", ["waiting", "active"]).gt("id", cursor).order("id").limit(500);
          if (error) throw new Error("game_sweep_read_failed");
          await sweepGames(a, games ?? []);
          swept += games?.length ?? 0;
          const last = games?.[games.length - 1];
          if (!last || !games || games.length < 500) break;
          cursor = last.id;
        }
        const now = new Date();
        const cutoff = new Date(now.getTime() - 7 * 864e5).toISOString();
        let sent = 0;
        cursor = "00000000-0000-0000-0000-000000000000";
        for (;;) {
        const { data: idle, error } = await a.from("players").select("id, last_played, last_reminder, tz, created_at")
          .not("push_token", "is", null).eq("notify", true).eq("notify_play", true).or(`last_played.lt.${cutoff},and(last_played.is.null,created_at.lt.${cutoff})`).gt("id", cursor).order("id").limit(500);
        if (error) throw new Error("reminder_read_failed");
        for (const p of idle ?? []) {
          if (!shouldSendPlayReminder(p, now)) continue;
          await a.from("players").update({ last_reminder: now.toISOString() }).eq("id", p.id);
          await notify(a, p.id, "pushPlayReminder", {}, {});
          sent++;
        }
        const last = idle?.[idle.length - 1];
        if (!last || !idle || idle.length < 500) break;
        cursor = last.id;
        }
        return Response.json({ swept, reminders: sent });
      },
    },
  },
});
