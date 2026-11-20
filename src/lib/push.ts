import { isNative } from "./native";
import { getCred, loadMe } from "./identity";
import { getMeta, setMeta } from "./meta";
import { setPush } from "./players.functions";
import { report } from "./report";
import type { PluginListenerHandle } from "@capacitor/core";

let listeners: Promise<void> | undefined;
let registering: Promise<void> | undefined;
let asking: Promise<void> | undefined;
let tokenUpdates = Promise.resolve();

function updateToken(token: string) {
  if (!token || token.length > 4096) return;
  // Serialize rotations so a slower old request cannot overwrite the newest token.
  tokenUpdates = tokenUpdates.then(async () => {
    await loadMe();
    await setPush({ data: { ...getCred(), token } });
  }).catch(() => report("error", "push_token_update", "Token upload failed"));
}

async function ensureListeners() {
  if (!listeners) listeners = (async () => {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const handles: PluginListenerHandle[] = [];
    try {
      handles.push(await PushNotifications.addListener("registration", (t) => updateToken(t.value)));
      handles.push(await PushNotifications.addListener("registrationError", () => report("error", "push_registration", "Native registration failed")));
      handles.push(await PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
        const game = (a.notification.data as { game?: unknown } | undefined)?.game;
        location.href = typeof game === "string" && game ? `/match?id=${encodeURIComponent(game)}` : "/";
      }));
    } catch (error) {
      await Promise.allSettled(handles.map((handle) => handle.remove()));
      throw error;
    }
  })().catch((error) => {
    listeners = undefined;
    throw error;
  });
  return listeners;
}

function register() {
  if (!registering) registering = (async () => {
    await ensureListeners();
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.register();
  })().finally(() => { registering = undefined; });
  return registering;
}

/** Asked the first time the player starts online play – never at app launch. */
export async function askPushOnFirstOnline() {
  if (!isNative() || getMeta().pushAsked) return;
  if (!asking) asking = (async () => {
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const p = await PushNotifications.requestPermissions();
      if (p.receive === "granted" || p.receive === "denied") setMeta({ pushAsked: true });
      if (p.receive === "granted") await register();
    } catch {
      report("error", "push_permission", "Permission or registration failed");
    }
  })().finally(() => { asking = undefined; });
  return asking;
}

/** At launch: re-register only if permission was already granted earlier. */
export async function resumePush() {
  if (!isNative()) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    if ((await PushNotifications.checkPermissions()).receive === "granted") await register();
  } catch { /* plugin missing or temporarily unavailable; retry next foreground */ }
}
