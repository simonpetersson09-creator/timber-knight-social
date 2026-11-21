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
- Completed results use the same deduplicated device-local totals for home and expanded statistics, with change events keeping mounted views current; saving or deleting a game never records a result.
- Touch back navigation uses a left-edge gesture shared across platforms, with popups handled first and match exits returning home without resigning; this avoids interpreting ordinary board touches as navigation.
- Players have no login: an anonymous device id+secret (src/lib/identity.ts) is verified by server functions in src/lib/players.functions.ts, which alone touch the players/friendships/matches tables (RLS on, no client policies) — keeps identity tamper-proof without accounts. Deletion anonymizes a tombstone and preserves opponents' match history; photo and database steps must succeed before local cleanup.
- Online games are server-authoritative: src/lib/online.functions.ts validates every move with chess.js; shared local/online completion and timeout-material rules live in src/lib/chess-rules.ts (tested), while pure timing/ad/rating rules live in src/lib/online-rules.ts. Quick pairing is serialized by the device-verified quick_match database operation; draw-offer limits persist per color. An hourly managed schedule calls /api/public/jobs/hourly for timeouts and reminders using a durable owner lease and 45-second budget.
- Native features (AdMob, push, in-app review, haptics, sharing, back button) load Capacitor plugins lazily and no-op on web; anonymous credentials use Keychain/Keystore on devices. The normal Capacitor shell loads the published site for online play; native:offline bundles the client for local computer games. Public web shows only a download page except /join, /legal, /rules and /admin.
- Profile photos use a private Storage bucket, device-verified server uploads and short-lived signed reads; store only a photo marker in the avatar field to avoid arbitrary image URLs.
- Friend play lives on its own /online route rather than expanding the home button; retain server-authoritative lobby and invitation flows.
- Notification categories are enforced by allowsNotification on the server so settings actually control delivery.
- Completion statistics and server play logs are recorded by the database game-update trigger in the same transaction; moves use active-state and position guards to prevent stale writes.
- Telemetry uses device-verified delivery, persistent bounded queues and unique event IDs; server rate limits and deduplication prevent retries inflating statistics.
- Abuse protection uses persistent hashed-subject quotas through the service-only chess_abuse_limit database operation, a 750 kB request cap and admin failure backoff; raw IP addresses and admin profiles are not stored. Admin uses a 30-minute HttpOnly session and never persists its password in browser storage.
- Daily native installation counts use Stockholm dates and foreground heartbeats; paginated statistics include the full eligible history and exclude web/test activity in admin and leaderboards.
- Shared GamePlayerCard/CapturedPieces components keep local and online game layouts consistent, with the board centred and actions at the bottom.
- Capacitor copy/sync hooks configure iOS QR camera and AdMob/ATT permissions plus Android AdMob application metadata and AD_ID automatically; shared full-screen ad policy lives in pure ad-rules.ts, with native SDK orchestration in ads.ts so consent/timing remain testable without affecting chess rules.
- The chess board uses a flat CSS grid surface with native square hit targets and pre-shaded SVG pieces, not a continuous WebGL loop, to keep mobile rendering lightweight without changing game logic.
- Computer levels above beginner use Stockfish 18 lite (WASM in a Web Worker: public/engine/stockfish.js, wasm via lovable-assets, src/lib/stockfish.ts); local minimax stays for beginner and as offline fallback — gives real strength without a server.
- Capacitor selects the existing Android package only for explicit Android CLI commands; its default matches the iOS Xcode bundle identifier so iOS packaging is consistent without migrating Android identity.
- Short game viewports use normal-flow profiles, trays, board and actions instead of absolute viewport-height budgeting, so scrolling preserves usable board dimensions.
- Root error and not-found boundaries resolve browser language only after hydration, so SSR and initial client rendering share a safe fallback.
- Online notifications are enqueued by database triggers into the service-only push_outbox with unique event keys, bounded retries and token-conditional invalidation, so each game commit and its outbox insert stay atomic.
- Local saved games are validated before use and clock state uses persisted epoch anchors with idempotent lifecycle checkpoints; no progression or unlock state remains.

- Online match updates use a data-free Realtime broadcast doorbell (`chess-game-<id>`, sent by database triggers) that makes clients re-read through server functions, with slow polling as fallback — keeps tables closed to clients while moves arrive instantly.
