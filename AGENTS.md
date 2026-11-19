<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->
- Chess rules via chess.js; computer opponent is local minimax in src/lib/engine.ts (no server needed for offline play).
- UI text lives in src/lib/i18n as ordered string arrays per language matching KEYS; add a key to KEYS and every locale array together (i18n.test.ts checks lengths).
- Saved games, stats and settings are device-local (src/lib/storage.ts, localStorage).
- Players have no login: an anonymous device id+secret (src/lib/identity.ts) is verified by server functions in src/lib/players.functions.ts, which alone touch the players/friendships/matches tables (RLS on, no client policies) — keeps identity tamper-proof without accounts.
- Online games are server-authoritative: src/lib/online.functions.ts validates every move with chess.js; pure timing/ad/rating rules live in src/lib/online-rules.ts (tested). An hourly managed schedule calls /api/public/jobs/hourly for timeouts and reminders.
- Native features (AdMob, push, in-app review, back button) load Capacitor plugins lazily and no-op on web; the Capacitor shell loads the published site (capacitor.config.ts server.url). Public web shows only a download page except /join, /legal, /admin.
- Profile photos use a private Storage bucket, device-verified server uploads and short-lived signed reads; store only a photo marker in the avatar field to avoid arbitrary image URLs.
- Friend play lives on its own /online route rather than expanding the home button; retain server-authoritative lobby and invitation flows.
- Notification categories are enforced by allowsNotification on the server so settings actually control delivery.
- Completion statistics and server play logs are recorded by the database game-update trigger in the same transaction; moves use active-state and position guards to prevent stale writes.
- Telemetry uses device-verified delivery, persistent bounded queues and unique event IDs; server rate limits and deduplication prevent retries inflating statistics.
- Daily native installation counts use Stockholm dates and foreground heartbeats; paginated statistics include the full eligible history and exclude web/test activity in admin.
- Shared GamePlayerCard/CapturedPieces components keep local and online game layouts consistent, with the board centred and actions at the bottom.
- Capacitor copy/sync hooks configure iOS QR camera permissions automatically when the native project exists, avoiding manual Info.plist edits.
- The chess board uses a flat CSS grid surface with native square hit targets and pre-shaded SVG pieces, not a continuous WebGL loop, to keep mobile rendering lightweight without changing game logic.
