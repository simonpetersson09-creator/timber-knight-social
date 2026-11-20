/**
 * Native AdMob for iOS and Android. UMP consent is gathered before ATT/SDK initialization.
 * App Open is restricted to the home screen; post-match Interstitials are shown only
 * by an explicit replay or exit action. No web ads, banners or rewarded ads.
 */
import { Capacitor } from "@capacitor/core";
import { isNative, platform } from "./native";
import { report } from "./report";
import { getMeta } from "./meta";
import {
  APP_OPEN_DELAY_MS, APP_OPEN_NO_FILL_RETRY_MS,
  canPresentAppOpen, canShowAppOpen, canShowPostMatchInterstitial, noFillRetryAt,
} from "./ad-rules";

type Ids = { appId: string | null; appOpen: string | null; interstitial: string | null };
type AdKind = "appOpen" | "interstitial";
type AdModule = typeof import("@capacitor-community/admob");

export const ADMOB_IDS: Record<"ios" | "android", Ids> = {
  ios: {
    appId: "ca-app-pub-7448540924654868~9129867558",
    appOpen: "ca-app-pub-7448540924654868/5190622544",
    interstitial: "ca-app-pub-7448540924654868/3006865222",
  },
  android: {
    appId: "ca-app-pub-7448540924654868~3769729660",
    appOpen: "ca-app-pub-7448540924654868/2997246035",
    interstitial: "ca-app-pub-7448540924654868/6064273400",
  },
};
export const ADMOB_TEST_IDS: Record<"ios" | "android", Omit<Ids, "appId">> = {
  ios: { appOpen: "ca-app-pub-3940256099942544/5575463023", interstitial: "ca-app-pub-3940256099942544/4411468910" },
  android: { appOpen: "ca-app-pub-3940256099942544/9257395921", interstitial: "ca-app-pub-3940256099942544/1033173712" },
};

function unit(kind: AdKind): string | null {
  const p = platform();
  if (p === "web") return null;
  if (import.meta.env.DEV) return ADMOB_TEST_IDS[p][kind];
  return ADMOB_IDS[p][kind];
}
function adAvailable(): boolean {
  return isNative() && Capacitor.isPluginAvailable("AdMob");
}
const mod = () => import("@capacitor-community/admob");
const online = () => typeof navigator === "undefined" || navigator.onLine;
const reason = (error: unknown) => String((error as { message?: string } | undefined)?.message ?? error ?? "unknown").slice(0, 180);

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}_timeout`)), ms);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}

const STORAGE_KEY = "mrbchess.ads.v2";
type StoredAds = { lastFullScreenAt: number; lastAttemptMatchId: string | null; pendingMatchId: string | null; appOpenNoFillRetryAt: number };
const EMPTY_ADS: StoredAds = { lastFullScreenAt: 0, lastAttemptMatchId: null, pendingMatchId: null, appOpenNoFillRetryAt: 0 };
function storedAds(): StoredAds {
  if (typeof localStorage === "undefined") return EMPTY_ADS;
  try { return { ...EMPTY_ADS, ...(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<StoredAds>) }; }
  catch { return EMPTY_ADS; }
}
function patchAds(patch: Partial<StoredAds>) {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...storedAds(), ...patch })); } catch { /* Storage failure must not affect play. */ }
}
function noteFullScreenShown() { patchAds({ lastFullScreenAt: Date.now() }); }

const launchAt = Date.now();
let foreground = true;
let currentPath = "/";
let gameplayActive = false;
let privacyGeneration = 0;
let initPromise: Promise<boolean> | null = null;
let listenersPromise: Promise<void> | null = null;
let appOpenTimer: ReturnType<typeof setTimeout> | null = null;
let appOpenAttempt = 0;
let appOpenShown = false;
let appOpenShowing = false;
let appOpenLoadedAt = 0;
let appOpenPreload: Promise<boolean> | null = null;
let interstitialReady = false;
let interstitialPreparedAt = 0;
let interstitialPreload: Promise<boolean> | null = null;
let interstitialShowing = false;
let interstitialDismiss: (() => void) | null = null;

/** Route and app-state context invalidates pending App Open attempts immediately. */
export function setAdLocation(path: string) {
  if (currentPath !== path) appOpenAttempt++;
  currentPath = path;
}
export function setGameplayActive(active: boolean) {
  if (active && !gameplayActive) appOpenAttempt++;
  gameplayActive = active;
}
export function setAdForeground(active: boolean) {
  if (foreground !== active) appOpenAttempt++;
  foreground = active;
}

async function ensureListeners(module: AdModule): Promise<void> {
  listenersPromise ??= (async () => {
    const { AdMob, AppOpenAdPluginEvents, InterstitialAdPluginEvents } = module;
    await Promise.all([
      AdMob.addListener(AppOpenAdPluginEvents.Opened, () => { noteFullScreenShown(); report("ad", "app_open_shown"); }),
      AdMob.addListener(AppOpenAdPluginEvents.Closed, () => { appOpenShowing = false; report("ad", "app_open_dismissed"); }),
      AdMob.addListener(AppOpenAdPluginEvents.FailedToShow, (error) => { appOpenShowing = false; report("ad", "app_open_failed_to_show", reason(error)); }),
      AdMob.addListener(InterstitialAdPluginEvents.Showed, () => { noteFullScreenShown(); report("ad", "interstitial_shown"); }),
      AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
        interstitialShowing = false;
        report("ad", "interstitial_dismissed");
        const done = interstitialDismiss;
        interstitialDismiss = null;
        done?.();
      }),
      AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, (error) => {
        interstitialShowing = false;
        report("ad", "interstitial_failed_to_show", reason(error));
        const done = interstitialDismiss;
        interstitialDismiss = null;
        done?.();
      }),
    ]);
  })().catch((error) => { listenersPromise = null; throw error; });
  return listenersPromise;
}

/** Initializes once for simultaneous callers. Failed attempts may be retried later. */
export function initAds(): Promise<boolean> {
  if (!adAvailable()) return Promise.resolve(false);
  if (initPromise) return initPromise;
  const generation = privacyGeneration;
  const attempt = (async () => {
    try {
      const module = await mod();
      const { AdMob } = module;
      await ensureListeners(module);
      let consent = await withTimeout(AdMob.requestConsentInfo(), 15_000, "consent_info");
      if (consent.isConsentFormAvailable && consent.status === "REQUIRED") {
        consent = await withTimeout(AdMob.showConsentForm(), 120_000, "consent_form");
      }
      if (!consent.canRequestAds) { report("ad", "consent_not_ready"); return false; }
      if (platform() === "ios") {
        const status = await withTimeout(AdMob.trackingAuthorizationStatus(), 10_000, "att_status");
        if (status.status === "notDetermined") await withTimeout(AdMob.requestTrackingAuthorization(), 120_000, "att_request");
      }
      await withTimeout(AdMob.initialize({ initializeForTesting: import.meta.env.DEV }), 15_000, "admob_init");
      if (generation !== privacyGeneration) return false;
      report("ad", "init_ok");
      return true;
    } catch (error) { report("ad", "init_failed", reason(error)); return false; }
  })();
  initPromise = attempt;
  void attempt.then((ok) => { if (!ok && initPromise === attempt) initPromise = null; });
  return attempt;
}

/** Privacy choices remain accessible even when consent does not currently permit ads. */
export async function openAdChoices(): Promise<boolean> {
  if (!adAvailable()) return false;
  try {
    await initAds();
    const { AdMob } = await mod();
    await withTimeout(AdMob.showPrivacyOptionsForm(), 120_000, "privacy_form");
    privacyGeneration++;
    initPromise = null;
    appOpenLoadedAt = 0;
    interstitialReady = false;
    interstitialPreparedAt = 0;
    void initAds().then(() => { void preloadInterstitial(); });
    return true;
  } catch (error) { report("ad", "privacy_form_failed", reason(error)); return false; }
}

async function preloadAppOpen(): Promise<boolean> {
  const id = unit("appOpen");
  if (!id || !adAvailable() || !online()) return false;
  if (appOpenLoadedAt > 0) return true;
  if (appOpenPreload) return appOpenPreload;
  const generation = privacyGeneration;
  const promise = (async () => {
    try {
      if (!(await initAds()) || generation !== privacyGeneration) return false;
      const { AdMob } = await mod();
      await withTimeout(AdMob.loadAppOpen({ adId: id }), 12_000, "app_open_load");
      if (generation !== privacyGeneration) return false;
      appOpenLoadedAt = Date.now();
      report("ad", "app_open_loaded");
      return true;
    } catch (error) {
      if (generation === privacyGeneration) {
        const retryAt = noFillRetryAt(error, Date.now());
        if (retryAt) patchAds({ appOpenNoFillRetryAt: retryAt });
        report("ad", "app_open_load_failed", reason(error));
      }
      return false;
    }
  })();
  appOpenPreload = promise;
  try { return await promise; } finally { if (appOpenPreload === promise) appOpenPreload = null; }
}

export function scheduleAppOpen(getPath: () => string) {
  if (appOpenTimer) clearTimeout(appOpenTimer);
  const delay = Math.max(0, APP_OPEN_DELAY_MS - (Date.now() - launchAt));
  appOpenTimer = setTimeout(() => { appOpenTimer = null; void maybeShowAppOpen(getPath()); }, delay);
}
export function cancelScheduledAppOpen() { if (appOpenTimer) clearTimeout(appOpenTimer); appOpenTimer = null; }

/** Loads ahead when possible, then repeats every eligibility check immediately before showing. */
export async function maybeShowAppOpen(path: string): Promise<boolean> {
  setAdLocation(path);
  const attempt = ++appOpenAttempt;
  const gate = () => ({
    native: adAvailable(), foreground, online: online(), now: Date.now(), lastFullScreenAt: storedAds().lastFullScreenAt,
    otherAdShowing: appOpenShowing || interstitialShowing, path: currentPath, finished: getMeta().finished,
    shownThisLaunch: appOpenShown, launchAt, playing: gameplayActive, noFillRetryAt: storedAds().appOpenNoFillRetryAt,
  });
  if (!canShowAppOpen(gate())) return false;
  report("ad", "app_open_opportunity");
  if (!(await preloadAppOpen())) return false;
  const loadedAt = appOpenLoadedAt;
  if (!canPresentAppOpen({ ...gate(), loadedAt, attemptValid: attempt === appOpenAttempt })) return false;
  const id = unit("appOpen");
  if (!id) return false;
  try {
    const { AdMob } = await mod();
    // This final synchronous gate is the cancellation point for late loads and game starts.
    if (!canPresentAppOpen({ ...gate(), loadedAt, attemptValid: attempt === appOpenAttempt })) return false;
    appOpenShown = true;
    appOpenShowing = true;
    await AdMob.showAppOpen({ adId: id }); // Both native plugins resolve after the ad closes.
    return true;
  } catch (error) { report("ad", "app_open_failed", reason(error)); return false; }
  finally {
    appOpenShowing = false;
    appOpenLoadedAt = 0;
    void preloadAppOpen();
  }
}

/** Preloads without presenting. Safe to call at startup and immediately after every result. */
export async function preloadInterstitial(): Promise<boolean> {
  const id = unit("interstitial");
  if (!id || !adAvailable() || !online() || interstitialShowing) return false;
  if (interstitialReady && Date.now() - interstitialPreparedAt < 55 * 60_000) return true;
  interstitialReady = false;
  if (interstitialPreload) return interstitialPreload;
  const generation = privacyGeneration;
  const promise = (async () => {
    try {
      if (!(await initAds()) || generation !== privacyGeneration) return false;
      const { AdMob } = await mod();
      await withTimeout(AdMob.prepareInterstitial({ adId: id }), 12_000, "interstitial_load");
      if (generation !== privacyGeneration || interstitialShowing) return false;
      interstitialPreparedAt = Date.now();
      interstitialReady = true;
      report("ad", "interstitial_loaded");
      return true;
    } catch (error) { report("ad", "interstitial_load_failed", reason(error)); return false; }
  })();
  interstitialPreload = promise;
  try { return await promise; } finally { if (interstitialPreload === promise) interstitialPreload = null; }
}

/** Marks a result immediately and starts loading; no ad is shown by this function. */
export function noteGameFinished(matchId: string) {
  setGameplayActive(false);
  patchAds({ pendingMatchId: matchId });
  void preloadInterstitial();
}

/** Called only by an explicit replay or exit action. Any failure resolves so play can continue. */
export async function showPostMatchAd(matchId: string, action: "replay" | "home" | "back" = "replay"): Promise<boolean> {
  report("ad", "interstitial_opportunity", JSON.stringify({ matchId, action }));
  const state = storedAds();
  const gate = () => ({
    native: adAvailable(), foreground, online: online(), now: Date.now(), lastFullScreenAt: storedAds().lastFullScreenAt,
    otherAdShowing: appOpenShowing || interstitialShowing, matchId, pendingMatchId: storedAds().pendingMatchId,
    lastAttemptMatchId: storedAds().lastAttemptMatchId, matchActive: gameplayActive, ready: interstitialReady,
  });
  if (!canShowPostMatchInterstitial(gate())) return false;
  const id = unit("interstitial");
  if (!id || !(await initAds())) return false;
  // Consume before calling the SDK: a second tap can never present the same match twice.
  patchAds({ lastAttemptMatchId: matchId });
  interstitialShowing = true;
  try {
    const { AdMob } = await mod();
    if (!canShowPostMatchInterstitial({ ...gate(), lastAttemptMatchId: state.lastAttemptMatchId, otherAdShowing: false })) return false;
    interstitialReady = false;
    const dismissed = new Promise<void>((resolve) => {
      interstitialDismiss = resolve;
      setTimeout(() => { if (interstitialDismiss === resolve) { interstitialDismiss = null; resolve(); } }, 90_000);
    });
    await AdMob.showInterstitial({ adId: id });
    await dismissed;
    return true;
  } catch (error) { report("ad", "interstitial_failed", reason(error)); return false; }
  finally {
    interstitialShowing = false;
    interstitialDismiss = null;
    void preloadInterstitial();
  }
}

/** Native back/swipe uses the same pending match and one-attempt guard as visible buttons. */
export async function showPendingPostMatchAd(currentMatchId: string): Promise<boolean> {
  const pending = storedAds().pendingMatchId;
  if (!pending || pending !== currentMatchId) return false;
  return showPostMatchAd(pending, "back");
}

// Kept for diagnostics: no-fill policy is shared only by App Open, not gameplay navigation.
export { APP_OPEN_NO_FILL_RETRY_MS };
