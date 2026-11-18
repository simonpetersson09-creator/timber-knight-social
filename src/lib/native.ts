import { Capacitor } from "@capacitor/core";
export const isNative = () => Capacitor.isNativePlatform();
export const platform = (): "ios" | "android" | "web" => { const p = Capacitor.getPlatform(); return p === "ios" || p === "android" ? p : "web"; };
/** Lovable preview / localhost keep the full app on web for testing; the public website shows the download page. */
export function isPreviewHost(host = typeof location !== "undefined" ? location.hostname : "") {
  return host === "localhost" || host.startsWith("127.") || host.includes("id-preview--") || host.includes("lovableproject.com") || host.endsWith("-dev.lovable.app");
}
