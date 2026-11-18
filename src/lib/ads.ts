/**
 * AdMob: one App Open ad at launch (start page only, after ≥1 finished game) and one
 * interstitial when a game ends. Google UMP consent + Apple ATT. Never on web.
 */
import { isNative, platform } from "./native";
import { report } from "./report";
import { getMeta } from "./meta";
import { canShowAppOpen } from "./online-rules";

type Ids = { appOpen: string | null; interstitial: string | null };
/** Chess's own AdMob IDs go here. While null, real ads are off (test ads in development builds). */
export const ADMOB_IDS: Record<"ios" | "android", Ids> = {
  ios: { appOpen: null, interstitial: null },
  android: { appOpen: null, interstitial: null },
};
const TEST: Record<"ios" | "android", Ids> = {
  ios: { appOpen: "ca-app-pub-3940256099942544/5575463023", interstitial: "ca-app-pub-3940256099942544/4411468910" },
  android: { appOpen: "ca-app-pub-3940256099942544/9257395921", interstitial: "ca-app-pub-3940256099942544/1033173712" },
};
function unit(kind: keyof Ids): string | null {
  const p = platform();
  if (p === "web") return null;
  return ADMOB_IDS[p][kind] ?? (import.meta.env.DEV ? TEST[p][kind] : null);
}
const mod = () => import("@capacitor-community/admob");
let ready: Promise<boolean> | null = null;

/** Initializes AdMob, asks ATT (iOS) and shows Google's consent form when required. */
export function initAds(): Promise<boolean> {
  if (!isNative()) return Promise.resolve(false);
  ready ??= (async () => {
    try {
      const { AdMob } = await mod();
      if (platform() === "ios") {
        const st = await AdMob.trackingAuthorizationStatus();
        if (st.status === "notDetermined") await AdMob.requestTrackingAuthorization();
      }
      await AdMob.initialize({});
      const info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === "REQUIRED") await AdMob.showConsentForm();
      report("ad", "init_ok");
      return true;
    } catch (e) { report("ad", "init_failed", String(e)); return false; }
  })();
  return ready;
}

/** Opens Google's privacy options so the player can change ad choices. */
export async function openAdChoices(): Promise<boolean> {
  if (!(await initAds())) return false;
  try { const { AdMob } = await mod(); await AdMob.showPrivacyOptionsForm(); return true; } catch (e) { report("ad", "privacy_form_failed", String(e)); return false; }
}

let appOpenShown = false;
export async function maybeShowAppOpen(path: string) {
  if (!canShowAppOpen({ path, finished: getMeta().finished, shownThisLaunch: appOpenShown, native: isNative() })) return;
  const id = unit("appOpen");
  if (!id || !(await initAds())) return;
  appOpenShown = true;
  try {
    const { AdMob } = await mod();
    await AdMob.loadAppOpen({ adId: id });
    if (location.pathname !== "/") return; // player already left the start page
    await AdMob.showAppOpen();
    report("ad", "app_open_shown");
  } catch (e) { report("ad", "app_open_failed", String(e)); }
}

/** Full-screen ad at game end. Resolves only after the player has closed it. */
export async function showGameEndAd(): Promise<void> {
  const id = unit("interstitial");
  if (!id || !(await initAds())) return;
  try {
    const { AdMob, InterstitialAdPluginEvents } = await mod();
    await AdMob.prepareInterstitial({ adId: id });
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      void AdMob.addListener(InterstitialAdPluginEvents.Dismissed, finish);
      void AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, finish);
      AdMob.showInterstitial().then(() => report("ad", "interstitial_shown")).catch((e) => { report("ad", "interstitial_failed", String(e)); finish(); });
    });
  } catch (e) { report("ad", "interstitial_load_failed", String(e)); }
}
