import { describe, expect, it } from "vitest";
import {
  APP_OPEN_DELAY_MS, APP_OPEN_MAX_AGE_MS, APP_OPEN_NO_FILL_RETRY_MS, FULLSCREEN_AD_INTERVAL_MS,
  canPresentAppOpen, canShowAppOpen, canShowPostMatchInterstitial, fullScreenIntervalElapsed, isNoFillError, noFillRetryAt,
  type AppOpenGate, type InterstitialGate,
} from "./ad-rules";

const now = 1_000_000_000;
const appOpen: AppOpenGate = {
  native: true, foreground: true, online: true, now, lastFullScreenAt: 0, otherAdShowing: false,
  path: "/", finished: 1, shownThisLaunch: false, launchAt: now - APP_OPEN_DELAY_MS, playing: false, noFillRetryAt: 0,
};
const interstitial: InterstitialGate = {
  native: true, foreground: true, online: true, now, lastFullScreenAt: 0, otherAdShowing: false,
  matchId: "match-1", pendingMatchId: "match-1", lastAttemptMatchId: null, matchActive: false, ready: true,
};

describe("full-screen ad policy", () => {
  it("enforces exactly 12 seconds after app launch", () => {
    expect(canShowAppOpen({ ...appOpen, now: appOpen.launchAt + 11_999 })).toBe(false);
    expect(canShowAppOpen({ ...appOpen, now: appOpen.launchAt + 12_000 })).toBe(true);
  });
  it("requires at least one completed match", () => {
    expect(canShowAppOpen({ ...appOpen, finished: 0 })).toBe(false);
    expect(canShowAppOpen({ ...appOpen, finished: 1 })).toBe(true);
  });
  it("allows App Open only on the home screen and once per launch", () => {
    expect(canShowAppOpen({ ...appOpen, path: "/play" })).toBe(false);
    expect(canShowAppOpen({ ...appOpen, shownThisLaunch: true })).toBe(false);
  });
  it("cancels App Open when play has started or the app is backgrounded", () => {
    expect(canShowAppOpen({ ...appOpen, playing: true })).toBe(false);
    expect(canShowAppOpen({ ...appOpen, foreground: false })).toBe(false);
  });
  it("requires native, online and no overlapping full-screen ad", () => {
    expect(canShowAppOpen({ ...appOpen, native: false })).toBe(false);
    expect(canShowAppOpen({ ...appOpen, online: false })).toBe(false);
    expect(canShowAppOpen({ ...appOpen, otherAdShowing: true })).toBe(false);
  });
  it("enforces the same two-minute interval for both formats", () => {
    const last = now - FULLSCREEN_AD_INTERVAL_MS + 1;
    expect(fullScreenIntervalElapsed(now, last)).toBe(false);
    expect(canShowAppOpen({ ...appOpen, lastFullScreenAt: last })).toBe(false);
    expect(canShowPostMatchInterstitial({ ...interstitial, lastFullScreenAt: last })).toBe(false);
    expect(fullScreenIntervalElapsed(now, now - FULLSCREEN_AD_INTERVAL_MS)).toBe(true);
  });
  it("blocks App Open for exactly 60 seconds after no-fill", () => {
    const retryAt = noFillRetryAt({ code: 3, message: "No fill" }, now);
    expect(retryAt).toBe(now + 60_000);
    expect(APP_OPEN_NO_FILL_RETRY_MS).toBe(60_000);
    expect(canShowAppOpen({ ...appOpen, noFillRetryAt: retryAt, now: retryAt - 1 })).toBe(false);
    expect(canShowAppOpen({ ...appOpen, noFillRetryAt: retryAt, now: retryAt })).toBe(true);
    expect(isNoFillError({ message: "network offline" })).toBe(false);
  });
  it("rejects stale, future-dated and superseded App Open loads", () => {
    const loadedAt = now - APP_OPEN_MAX_AGE_MS;
    expect(canPresentAppOpen({ ...appOpen, loadedAt, attemptValid: true })).toBe(true);
    expect(canPresentAppOpen({ ...appOpen, loadedAt: loadedAt - 1, attemptValid: true })).toBe(false);
    expect(canPresentAppOpen({ ...appOpen, loadedAt: now + 1, attemptValid: true })).toBe(false);
    expect(canPresentAppOpen({ ...appOpen, loadedAt: now, attemptValid: false })).toBe(false);
  });
  it("shows Interstitial only for the pending finished match with a prepared ad", () => {
    expect(canShowPostMatchInterstitial(interstitial)).toBe(true);
    expect(canShowPostMatchInterstitial({ ...interstitial, pendingMatchId: "other" })).toBe(false);
    expect(canShowPostMatchInterstitial({ ...interstitial, ready: false })).toBe(false);
  });
  it("permits at most one Interstitial attempt per completed match", () => {
    expect(canShowPostMatchInterstitial({ ...interstitial, lastAttemptMatchId: "match-1" })).toBe(false);
    expect(canShowPostMatchInterstitial({ ...interstitial, lastAttemptMatchId: "match-0" })).toBe(true);
  });
  it("never shows Interstitial during active play", () => {
    expect(canShowPostMatchInterstitial({ ...interstitial, matchActive: true })).toBe(false);
  });
  it("lets play continue offline, in background, on web and during another ad", () => {
    expect(canShowPostMatchInterstitial({ ...interstitial, online: false })).toBe(false);
    expect(canShowPostMatchInterstitial({ ...interstitial, foreground: false })).toBe(false);
    expect(canShowPostMatchInterstitial({ ...interstitial, native: false })).toBe(false);
    expect(canShowPostMatchInterstitial({ ...interstitial, otherAdShowing: true })).toBe(false);
  });
});
