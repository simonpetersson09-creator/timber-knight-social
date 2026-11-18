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
        const { data: games } = await a.from("games").select("id, kind, status, host, white, black, fen, last_move_at, reminded, expires_at").in("status", ["waiting", "active"]).limit(1000);
        await sweepGames(a, games ?? []);
        const now = new Date();
        const cutoff = new Date(now.getTime() - 7 * 864e5).toISOString();
        const { data: idle } = await a.from("players").select("id, last_played, last_reminder, tz, created_at")
          .not("push_token", "is", null).eq("notify", true).or(`last_played.lt.${cutoff},and(last_played.is.null,created_at.lt.${cutoff})`).limit(1000);
        let sent = 0;
        for (const p of idle ?? []) {
          if (!shouldSendPlayReminder(p, now)) continue;
          await a.from("players").update({ last_reminder: now.toISOString() }).eq("id", p.id);
          await notify(a, p.id, "pushPlayReminder", {}, {});
          sent++;
        }
        return Response.json({ swept: games?.length ?? 0, reminders: sent });
      },
    },
  },
});
