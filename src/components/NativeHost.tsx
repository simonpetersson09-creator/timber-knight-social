import { useEffect, useRef } from "react";
import { useLocation, useRouter } from "@tanstack/react-router";
import { isNative } from "@/lib/native";
import { isBackSwipe, type SwipePoint } from "@/lib/swipe-back";
import { runTopBackHandler } from "@/lib/back-handler";
import {
  cancelScheduledAppOpen, initAds, maybeShowAppOpen, preloadInterstitial, scheduleAppOpen, setAdForeground, setAdLocation,
} from "@/lib/ads";
import { resumePush } from "@/lib/push";
import { flushReports, report } from "@/lib/report";
import { loadMe } from "@/lib/identity";

/** App-wide native behaviour: navigation, ads, push and error reports. */
export function NativeHost() {
  const router = useRouter();
  const { pathname } = useLocation();
  const path = useRef(pathname);
  path.current = pathname;

  useEffect(() => { setAdLocation(pathname); }, [pathname]);

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
    setAdForeground(document.visibilityState === "visible");
    void initAds().then(() => {
      void preloadInterstitial();
      scheduleAppOpen(() => path.current);
    });
    const foregroundAds = () => {
      const active = document.visibilityState === "visible";
      setAdForeground(active);
      if (active) { void maybeShowAppOpen(path.current); void preloadInterstitial(); }
    };
    document.addEventListener("visibilitychange", foregroundAds);
    let remove: (() => void) | undefined;
    void import("@capacitor/app").then(({ App }) => {
      const back = App.addListener("backButton", () => {
        if (runTopBackHandler()) return; // close popups first
        if (path.current === "/") void App.minimizeApp();
        else if (window.history.length > 1) router.history.back();
        else void router.navigate({ to: "/" });
      });
      const state = App.addListener("appStateChange", ({ isActive }) => {
        setAdForeground(isActive);
        if (isActive) { void maybeShowAppOpen(path.current); void preloadInterstitial(); }
      });
      remove = () => { void Promise.all([back, state]).then((handles) => handles.forEach((handle) => handle.remove())); };
    });
    return () => { cancelScheduledAppOpen(); document.removeEventListener("visibilitychange", foregroundAds); remove?.(); };
  }, [router]);

  // All touch devices: edge swipe goes back, including saved/online games.
  useEffect(() => {
    let start: SwipePoint | null = null;
    const s = (e: TouchEvent) => { const t = e.touches[0]; start = t && e.touches.length === 1 && t.clientX <= 28 ? { x: t.clientX, y: t.clientY } : null; };
    const end = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!start || !t) return;
      const valid = isBackSwipe(start, { x: t.clientX, y: t.clientY });
      start = null;
      if (!valid) return;
      if (runTopBackHandler()) return;
      if (path.current === "/") return;
      if (path.current === "/play" || path.current === "/match" || !router.history.canGoBack()) void router.navigate({ to: "/" });
      else router.history.back();
    };
    const cancel = () => { start = null; };
    window.addEventListener("touchstart", s, { passive: true });
    window.addEventListener("touchend", end, { passive: true });
    window.addEventListener("touchcancel", cancel, { passive: true });
    return () => { window.removeEventListener("touchstart", s); window.removeEventListener("touchend", end); window.removeEventListener("touchcancel", cancel); };
  }, [router]);

  return null;
}
