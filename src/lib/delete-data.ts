import { clearIdentity, getCred } from "./identity";
import { deleteMyData } from "./players.functions";
import { setReportingPaused } from "./report";

const CLEANUP_PENDING = "mrbchess.data-deletion-cleanup.v1";
let cleanupPending = false;

function hasCleanupMarker(): boolean {
  if (cleanupPending) return true;
  for (const storage of [localStorage, sessionStorage]) {
    try { if (storage.getItem(CLEANUP_PENDING) === "1") return true; } catch { /* unavailable */ }
  }
  return false;
}

function markCleanupPending() {
  cleanupPending = true;
  for (const storage of [localStorage, sessionStorage]) {
    try { storage.setItem(CLEANUP_PENDING, "1"); } catch { /* the in-memory marker still allows retry */ }
  }
}

function clearPlayerStorage() {
  let firstError: unknown = null;
  for (const storage of [localStorage, sessionStorage]) {
    let keys: string[] = [];
    try { keys = Object.keys(storage); } catch (error) { firstError ??= error; }
    for (const key of keys) {
      if (!key.startsWith("mrbchess.") || key === CLEANUP_PENDING) continue;
      try { storage.removeItem(key); } catch (error) { firstError ??= error; }
    }
  }
  if (firstError) throw firstError;
}

function clearCleanupMarkers() {
  for (const storage of [localStorage, sessionStorage]) {
    try { storage.removeItem(CLEANUP_PENDING); } catch { /* harmless after successful player-data cleanup */ }
  }
  cleanupPending = false;
}

/** Deletes remotely first; an interrupted native/local cleanup can retry without repeating the RPC. */
export async function deleteAllMyData(): Promise<void> {
  if (!hasCleanupMarker()) {
    const result = await deleteMyData({ data: getCred() });
    if (!result.ok) throw new Error("data_delete_failed");
    markCleanupPending();
  }
  setReportingPaused(true);
  try {
    await clearIdentity();
    clearPlayerStorage();
    clearCleanupMarkers();
  } catch (error) {
    // Keep reporting paused so deleted telemetry cannot be recreated before retry.
    throw error;
  }
  setReportingPaused(false);
}
