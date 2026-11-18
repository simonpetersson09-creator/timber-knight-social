import { isNative } from "./native";
import { getCred } from "./identity";
import { getMeta, setMeta } from "./meta";
import { setPush } from "./players.functions";
import { report } from "./report";

async function register() {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  await PushNotifications.addListener("registration", (t) => { void setPush({ data: { ...getCred(), token: t.value } }); });
  await PushNotifications.addListener("registrationError", (e) => report("error", "push_registration", JSON.stringify(e)));
  await PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
    const game = (a.notification.data as { game?: string } | undefined)?.game;
    location.href = game ? `/match?id=${game}` : "/";
  });
  await PushNotifications.register();
}

/** Asked the first time the player starts online play – never at app launch. */
export async function askPushOnFirstOnline() {
  if (!isNative() || getMeta().pushAsked) return;
  setMeta({ pushAsked: true });
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const p = await PushNotifications.requestPermissions();
    if (p.receive === "granted") await register();
  } catch (e) { report("error", "push_permission", String(e)); }
}

/** At launch: re-register only if permission was already granted earlier. */
export async function resumePush() {
  if (!isNative()) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    if ((await PushNotifications.checkPermissions()).receive === "granted") await register();
  } catch { /* plugin missing */ }
}
