import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  native: true,
  platform: "ios" as "ios" | "android" | "web",
  finished: 1,
  att: "authorized",
  calls: [] as string[],
  report: vi.fn(),
  addListener: vi.fn(),
  requestConsentInfo: vi.fn(),
  showConsentForm: vi.fn(),
  showPrivacyOptionsForm: vi.fn(),
  trackingAuthorizationStatus: vi.fn(),
  requestTrackingAuthorization: vi.fn(),
  initialize: vi.fn(),
  loadAppOpen: vi.fn(),
  showAppOpen: vi.fn(),
  prepareInterstitial: vi.fn(),
  showInterstitial: vi.fn(),
  showBanner: vi.fn(),
  removeBanner: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => m.native,
    isPluginAvailable: () => true,
    getPlatform: () => m.platform,
  },
}));
vi.mock("./native", () => ({ isNative: () => m.native, platform: () => m.platform }));
vi.mock("./meta", () => ({ getMeta: () => ({ finished: m.finished, rateAsked: 0, pushAsked: false }) }));
vi.mock("./report", () => ({ report: m.report }));
vi.mock("@capacitor-community/admob", () => ({
  AdMob: m,
  AppOpenAdPluginEvents: { Opened: "appOpenOpened", Closed: "appOpenClosed", FailedToShow: "appOpenFailedToShow" },
  InterstitialAdPluginEvents: { Showed: "interstitialShowed", Dismissed: "interstitialDismissed", FailedToShow: "interstitialFailedToShow" },
  BannerAdSize: { MEDIUM_RECTANGLE: "MEDIUM_RECTANGLE" },
  BannerAdPosition: { BOTTOM_CENTER: "BOTTOM_CENTER" },
}));

const consent = (canRequestAds = true) => ({
  status: canRequestAds ? "OBTAINED" : "REQUIRED",
  isConsentFormAvailable: false,
  canRequestAds,
  privacyOptionsRequirementStatus: "NOT_REQUIRED",
});

async function flush() {
  for (let i = 0; i < 8; i++) await vi.advanceTimersByTimeAsync(0);
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  localStorage.clear();
  m.native = true;
  m.platform = "ios";
  m.finished = 1;
  m.att = "authorized";
  m.calls = [];
  m.addListener.mockImplementation(async () => ({ remove: vi.fn(async () => {}) }));
  m.requestConsentInfo.mockImplementation(async () => { m.calls.push("ump"); return consent(); });
  m.showConsentForm.mockImplementation(async () => { m.calls.push("umpForm"); return consent(); });
  m.showPrivacyOptionsForm.mockImplementation(async () => { m.calls.push("privacyForm"); });
  m.trackingAuthorizationStatus.mockImplementation(async () => { m.calls.push("attStatus"); return { status: m.att }; });
  m.requestTrackingAuthorization.mockImplementation(async () => { m.calls.push("attRequest"); m.att = "denied"; });
  m.initialize.mockImplementation(async () => { m.calls.push("initialize"); });
  m.loadAppOpen.mockResolvedValue(undefined);
  m.showAppOpen.mockResolvedValue(undefined);
  m.prepareInterstitial.mockResolvedValue(undefined);
  m.showInterstitial.mockResolvedValue(undefined);
  m.showBanner.mockResolvedValue(undefined);
  m.removeBanner.mockResolvedValue(undefined);
});

afterEach(() => { vi.useRealTimers(); });

describe("native ad lifecycle", () => {
  it("presents App Open at 12 seconds, never at 11.999 seconds", async () => {
    const ads = await import("./ads");
    ads.scheduleAppOpen(() => "/");
    await vi.advanceTimersByTimeAsync(11_999);
    expect(m.showAppOpen).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(m.showAppOpen).toHaveBeenCalledTimes(1);
  });

  it("discards a late App Open load after backgrounding and reloads on return", async () => {
    let release!: () => void;
    let first = true;
    m.loadAppOpen.mockImplementation(() => {
      if (!first) return Promise.resolve();
      first = false;
      return new Promise<void>((resolve) => { release = resolve; });
    });
    const ads = await import("./ads");
    vi.setSystemTime(1_012_000);
    const late = ads.maybeShowAppOpen("/");
    await flush();
    expect(m.loadAppOpen).toHaveBeenCalledTimes(1);
    ads.setAdForeground(false);
    release();
    await expect(late).resolves.toBe(false);
    expect(m.showAppOpen).not.toHaveBeenCalled();

    ads.setAdForeground(true);
    await expect(ads.maybeShowAppOpen("/")).resolves.toBe(true);
    expect(m.loadAppOpen).toHaveBeenCalledTimes(2);
    expect(m.showAppOpen).toHaveBeenCalledTimes(1);
  });

  it("cancels a pending App Open load when gameplay starts", async () => {
    let release!: () => void;
    m.loadAppOpen.mockImplementation(() => new Promise<void>((resolve) => { release = resolve; }));
    const ads = await import("./ads");
    vi.setSystemTime(1_012_000);
    const late = ads.maybeShowAppOpen("/");
    await flush();
    ads.setGameplayActive(true);
    release();
    await expect(late).resolves.toBe(false);
    expect(m.showAppOpen).not.toHaveBeenCalled();
  });
});

describe("UMP and ATT ordering", () => {
  it("reads the privacy-button requirement without initializing ads or asking ATT", async () => {
    m.requestConsentInfo.mockResolvedValue({ ...consent(), privacyOptionsRequirementStatus: "REQUIRED" });
    const ads = await import("./ads");
    await expect(ads.isAdPrivacyOptionsRequired()).resolves.toBe(true);
    expect(m.initialize).not.toHaveBeenCalled();
    expect(m.trackingAuthorizationStatus).not.toHaveBeenCalled();
  });

  it("opens existing privacy choices before any consent refresh or ATT prompt", async () => {
    const ads = await import("./ads");
    await expect(ads.openAdChoices()).resolves.toBe(true);
    expect(m.calls[0]).toBe("privacyForm");
  });

  it("reports a failed privacy form to the settings button", async () => {
    m.showPrivacyOptionsForm.mockRejectedValue(new Error("not required"));
    const ads = await import("./ads");
    await expect(ads.openAdChoices()).resolves.toBe(false);
    expect(m.report).toHaveBeenCalledWith("ad", "privacy_form_failed", "not required");
  });

  it("finishes UMP before ATT and records status-only evidence", async () => {
    m.att = "notDetermined";
    m.requestConsentInfo.mockImplementation(async () => { m.calls.push("ump"); return { ...consent(), status: "REQUIRED", isConsentFormAvailable: true }; });
    const ads = await import("./ads");
    await expect(ads.initAds()).resolves.toBe(true);
    expect(m.calls).toEqual(["ump", "umpForm", "attStatus", "attRequest", "attStatus", "initialize"]);
    expect(m.report).toHaveBeenCalledWith("ad", "att_status", "denied");
    expect(m.report).toHaveBeenCalledWith("ad", "consent_status", expect.stringContaining('"canRequestAds":true'));
  });

  it("uses UMP without ATT on Android", async () => {
    m.platform = "android";
    const ads = await import("./ads");
    await expect(ads.initAds()).resolves.toBe(true);
    expect(m.calls).toEqual(["ump", "initialize"]);
    expect(m.trackingAuthorizationStatus).not.toHaveBeenCalled();
    expect(m.requestTrackingAuthorization).not.toHaveBeenCalled();
  });

  it("does not initialize or load any ad format when UMP disallows requests", async () => {
    m.requestConsentInfo.mockResolvedValue(consent(false));
    const ads = await import("./ads");
    vi.setSystemTime(1_012_000);
    await expect(ads.initAds()).resolves.toBe(false);
    await expect(ads.maybeShowAppOpen("/")).resolves.toBe(false);
    ads.noteGameFinished("match-1");
    await expect(ads.showPostMatchAd("match-1")).resolves.toBe(false);
    expect(m.initialize).not.toHaveBeenCalled();
    expect(m.loadAppOpen).not.toHaveBeenCalled();
    expect(m.prepareInterstitial).not.toHaveBeenCalled();
    expect(m.showInterstitial).not.toHaveBeenCalled();
  });

  it("drops an obsolete UMP flow when privacy choices invalidate it", async () => {
    let release!: (value: ReturnType<typeof consent>) => void;
    let calls = 0;
    m.requestConsentInfo.mockImplementation(() => {
      calls++;
      if (calls > 1) return Promise.resolve(consent());
      return new Promise<ReturnType<typeof consent>>((resolve) => { release = resolve; });
    });
    const ads = await import("./ads");
    const obsolete = ads.initAds();
    await flush();
    const choices = ads.openAdChoices();
    await flush();
    release({ ...consent(), status: "REQUIRED", isConsentFormAvailable: true });
    await expect(obsolete).resolves.toBe(false);
    await expect(choices).resolves.toBe(true);
    expect(m.showConsentForm).not.toHaveBeenCalled();
    expect(m.showPrivacyOptionsForm).toHaveBeenCalledTimes(1);
  });
});
