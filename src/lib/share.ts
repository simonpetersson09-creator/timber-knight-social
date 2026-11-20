import { isNative } from "./native";

/** Copies through the modern API, with a WebView-safe fallback for older devices. */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch { /* try the WebView-compatible fallback below */ }
  }
  const field = document.createElement("textarea");
  field.value = text;
  field.readOnly = true;
  field.style.position = "fixed";
  field.style.opacity = "0";
  field.style.pointerEvents = "none";
  document.body.appendChild(field);
  field.select();
  field.setSelectionRange(0, field.value.length);
  try {
    if (!document.execCommand("copy")) throw new Error("copy_failed");
  } finally {
    field.remove();
  }
}

function isShareCancellation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error && typeof error.name === "string" ? error.name : "";
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return name === "AbortError" || /cancel|abort/i.test(message);
}

/** Shares a URL in the native share sheet or Web Share API, then falls back to copying it. */
export async function shareLink(title: string, text: string, url: string): Promise<"shared" | "cancelled" | "copied"> {
  try {
    if (isNative()) {
      const { Share } = await import("@capacitor/share");
      const capability = await Share.canShare();
      if (capability.value) {
        await Share.share({ title, text, url, dialogTitle: title });
        return "shared";
      }
    } else if (navigator.share) {
      await navigator.share({ title, text, url });
      return "shared";
    }
  } catch (error) {
    if (isShareCancellation(error)) return "cancelled";
    throw error;
  }
  await copyText(url);
  return "copied";
}

/** Uses the phone's share sheet in the app and the system Web Share API elsewhere. */
export async function shareText(title: string, text: string): Promise<"shared" | "cancelled" | "copied"> {
  try {
    if (isNative()) {
      const { Share } = await import("@capacitor/share");
      const capability = await Share.canShare();
      if (capability.value) {
        await Share.share({ title, text, dialogTitle: title });
        return "shared";
      }
    } else if (navigator.share) {
      await navigator.share({ title, text });
      return "shared";
    }
  } catch (error) {
    if (isShareCancellation(error)) return "cancelled";
    throw error;
  }
  await copyText(text);
  return "copied";
}
