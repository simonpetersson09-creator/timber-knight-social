import { reportEvent } from "./players.functions";
import { getCred, loadMe } from "./identity";
import { allowsGameplayRuntime } from "./native";

type Event = { eventId: string; kind: "error" | "ad" | "play"; name: string; detail: string | null };
const KEY = "mrbchess.reports.v1";
const ONCE_KEY = "mrbchess.report-once.v1";
const MAX_QUEUED = 100;
const MAX_PER_FLUSH = 100;
let flushing = false;

function isEvent(value: unknown): value is Event {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return typeof event["eventId"] === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event["eventId"]) &&
    ["error", "ad", "play"].includes(event["kind"] as string) &&
    typeof event["name"] === "string" && event["name"].length > 0 && event["name"].length <= 80 &&
    (event["detail"] === null || (typeof event["detail"] === "string" && event["detail"].length <= 2000));
}

function queue(): Event[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    const events = Array.isArray(value) ? value.filter(isEvent) : [];
    if (!Array.isArray(value) || events.length !== value.length) save(events);
    return events;
  } catch { return []; }
}

function important(event: Event) {
  return event.kind === "error" || /^(?:local|online)_game_(?:started|finished)$/.test(event.name);
}

/** Keep important events and the newest events when storage reaches its bound. */
function bounded(events: Event[]) {
  if (events.length <= MAX_QUEUED) return events;
  return events.map((event, index) => ({ event, index }))
    .sort((a, b) => Number(important(b.event)) - Number(important(a.event)) || b.index - a.index)
    .slice(0, MAX_QUEUED)
    .sort((a, b) => a.index - b.index)
    .map(({ event }) => event);
}

function save(events: Event[]) {
  try { localStorage.setItem(KEY, JSON.stringify(bounded(events))); return true; }
  catch { return false; }
}

function enqueue(kind: Event["kind"], name: string, detail?: string) {
  return save([...queue(), { eventId: crypto.randomUUID(), kind, name: name.slice(0, 80), detail: detail?.slice(0, 2000) ?? null }]);
}

/** Durable, bounded delivery queue. IDs stay the same during retries so reports count once. */
export function report(kind: Event["kind"], name: string, detail?: string) {
  if (!allowsGameplayRuntime()) return;
  if (enqueue(kind, name, detail)) void flushReports();
}

function onceMarkers() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(ONCE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((key): key is string => typeof key === "string") : [];
  } catch { return []; }
}

/** Queues a lifecycle event once per installation and logical game milestone. */
export function reportOnce(kind: Event["kind"], name: string, detail: string | undefined, key: string) {
  if (!allowsGameplayRuntime()) return;
  const sent = onceMarkers();
  if (sent.includes(key)) return;
  if (!enqueue(kind, name, detail)) return;
  try { localStorage.setItem(ONCE_KEY, JSON.stringify([...sent, key].slice(-200))); } catch { /* queue/server deduplication still applies */ }
  void flushReports();
}

export async function flushReports() {
  if (!allowsGameplayRuntime() || flushing || !queue().length || !navigator.onLine) return;
  flushing = true;
  let drained = 0;
  try {
    await loadMe();
    while (drained < MAX_PER_FLUSH && navigator.onLine) {
      const event = queue().map((item, index) => ({ item, index }))
        .sort((a, b) => Number(important(b.item)) - Number(important(a.item)) || a.index - b.index)[0]?.item;
      if (!event) break;
      const result = await reportEvent({ data: { ...getCred(), ...event } });
      if (!result.ok) break;
      save(queue().filter((item) => item.eventId !== event.eventId));
      drained++;
    }
  } catch { /* retry when online/foreground/heartbeat fires */ }
  finally { flushing = false; }
  if (drained >= MAX_PER_FLUSH && queue().length && navigator.onLine) {
    setTimeout(() => { void flushReports(); }, 0);
  }
}
