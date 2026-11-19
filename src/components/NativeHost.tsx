import { useEffect, useRef } from "react";
import { useLocation, useRouter } from "@tanstack/react-router";
import { isNative, platform } from "@/lib/native";
import { runTopBackHandler } from "@/lib/back-handler";
import { maybeShowAppOpen, initAds } from "@/lib/ads";
import { resumePush } from "@/lib/push";
import { flushReports, report } from "@/lib/report";
import { loadMe } from "@/lib/identity";

/** App-wide native behaviour: back button, iOS swipe back, launch ad, push, error reports. */
export function NativeHost() {
  const router = useRouter();
  const { pathname } = useLocation();
  const path = useRef(pathname);
  path.current = pathname;

  useEffect(() => {
    void loadMe().catch(() => {});
    const foreground = () => { if (document.visibilityState === "visible") { void loadMe(true).catch(() => {}); void flushReports(); } };
    const heartbeat = setInterval(foreground, 60_000);
    window.addEventListener("online", foreground);
    document.addEventListener("visibilitychange", foreground);
    const onErr = (e: ErrorEvent) => report("error", e.message || "error", `${e.filename}:${e.lineno}`);
    const onRej = (e: PromiseRejectionEvent) => report("error", String(e.reason).slice(0, 80), String((e.reason as Error)?.stack ?? ""));
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => { clearInterval(heartbeat); window.removeEventListener("online", foreground); document.removeEventListener("visibilitychange", foreground); window.removeEventListener("error", onErr); window.removeEventListener("unhandledrejection", onRej); };
  }, []);

  useEffect(() => {
    if (!isNative()) return;
    void resumePush();
    void initAds().then(() => maybeShowAppOpen(path.current));
    let remove: (() => void) | undefined;
    void import("@capacitor/app").then(({ App }) => {
      const h = App.addListener("backButton", () => {
        if (runTopBackHandler()) return; // close popups first
        if (path.current === "/") void App.minimizeApp();
        else if (window.history.length > 1) router.history.back();
        else void router.navigate({ to: "/" });
      });
      remove = () => { void h.then((x) => x.remove()); };
    });
    return () => remove?.();
  }, [router]);

  // iPhone: swipe from the left edge to go back (not on start page or in a game).
  useEffect(() => {
    if (platform() !== "ios") return;
    let start: { x: number; y: number } | null = null;
    const s = (e: TouchEvent) => { const t = e.touches[0]; start = t && e.touches.length === 1 && t.clientX <= 28 ? { x: t.clientX, y: t.clientY } : null; };
    const end = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!start || !t) return;
      const dx = t.clientX - start.x, dy = Math.abs(t.clientY - start.y);
      start = null;
      if (dx < 70 || dy > dx / 2) return;
      if (runTopBackHandler()) return;
      if (["/", "/play", "/match"].includes(path.current)) return;
      router.history.back();
    };
    window.addEventListener("touchstart", s, { passive: true });
    window.addEventListener("touchend", end, { passive: true });
    return () => { window.removeEventListener("touchstart", s); window.removeEventListener("touchend", end); };
  }, [router]);

  return null;
}
