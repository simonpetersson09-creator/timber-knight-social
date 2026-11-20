import { reportEvent } from "./players.functions";
import { getCred, loadMe } from "./identity";

type Event = { eventId: string; kind: "error" | "ad" | "play"; name: string; detail: string | null };
const KEY = "mrbchess.reports.v1";
const ONCE_KEY = "mrbchess.report-once.v1";
let flushing = false;
function queue(): Event[] { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Event[]; } catch { return []; } }
function save(events: Event[]) { try { localStorage.setItem(KEY, JSON.stringify(events.slice(-100))); } catch { /* full storage */ } }
/** Durable, bounded delivery queue. IDs stay the same during retries so reports count once. */
export function report(kind: Event["kind"], name: string, detail?: string) {
  save([...queue(), { eventId: crypto.randomUUID(), kind, name: name.slice(0, 80), detail: detail?.slice(0, 2000) ?? null }]);
  void flushReports();
}
/** Queues a lifecycle event once per installation and logical game milestone. */
export function reportOnce(kind: Event["kind"], name: string, detail: string | undefined, key: string) {
  let sent: string[] = [];
  try { sent = JSON.parse(localStorage.getItem(ONCE_KEY) ?? "[]") as string[]; } catch { /* invalid marker storage */ }
  if (sent.includes(key)) return;
  try { localStorage.setItem(ONCE_KEY, JSON.stringify([...sent, key].slice(-200))); } catch { /* the durable event queue still applies */ }
  report(kind, name, detail);
}

export async function flushReports() {
  if (flushing || !queue().length || !navigator.onLine) return;
  flushing = true;
  try {
    await loadMe();
    for (const event of queue().slice(0, 20)) {
      const result = await reportEvent({ data: { ...getCred(), ...event } });
      if (!result.ok) break;
      save(queue().filter((e) => e.eventId !== event.eventId));
    }
  } catch { /* retry when online/foreground/heartbeat fires */ }
  finally { flushing = false; }
}