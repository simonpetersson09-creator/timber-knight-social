import { reportEvent } from "./players.functions";
import { platform } from "./native";
function myId(): string | null { try { return (JSON.parse(localStorage.getItem("mrbchess.identity.v1") ?? "null") as { id: string } | null)?.id ?? null; } catch { return null; } }
let sent = 0;
/** Error and ad reports for the admin page (max 30 per launch). */
export function report(kind: "error" | "ad", name: string, detail?: string) {
  if (sent++ > 30) return;
  void reportEvent({ data: { id: myId(), platform: platform(), kind, name: name.slice(0, 80), detail: detail?.slice(0, 2000) ?? null } }).catch(() => {});
}
