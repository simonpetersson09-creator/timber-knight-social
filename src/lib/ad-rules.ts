// Pure full-screen ad policy. Native SDK calls live in ads.ts; every timing rule is tested here.
export const APP_OPEN_DELAY_MS = 12_000;
export const APP_OPEN_MAX_AGE_MS = 4 * 60 * 60 * 1000;
export const APP_OPEN_NO_FILL_RETRY_MS = 60_000;
export const FULLSCREEN_AD_INTERVAL_MS = 2 * 60_000;

export type FullScreenGate = {
  native: boolean;
  foreground: boolean;
  online: boolean;
  now: number;
  lastFullScreenAt: number;
  otherAdShowing: boolean;
};

export type AppOpenGate = FullScreenGate & {
  path: string;
  finished: number;
  shownThisLaunch: boolean;
  launchAt: number;
  playing: boolean;
  noFillRetryAt: number;
};

export function fullScreenIntervalElapsed(now: number, lastFullScreenAt: number): boolean {
  return lastFullScreenAt <= 0 || (now >= lastFullScreenAt && now - lastFullScreenAt >= FULLSCREEN_AD_INTERVAL_MS);
}

function commonAllowed(gate: FullScreenGate): boolean {
  return gate.native && gate.foreground && gate.online && !gate.otherAdShowing && fullScreenIntervalElapsed(gate.now, gate.lastFullScreenAt);
}

/** App Open is a home-screen opportunity only, never a delayed interruption of play. */
export function canShowAppOpen(gate: AppOpenGate): boolean {
  return commonAllowed(gate)
    && gate.path === "/"
    && gate.finished >= 1
    && !gate.shownThisLaunch
    && !gate.playing
    && gate.now >= gate.launchAt
    && gate.now - gate.launchAt >= APP_OPEN_DELAY_MS
    && gate.now >= gate.noFillRetryAt;
}

/** Recheck immediately before presentation and reject stale/late native loads. */
export function canPresentAppOpen(gate: AppOpenGate & { loadedAt: number; attemptValid: boolean }): boolean {
  const age = gate.now - gate.loadedAt;
  return gate.attemptValid && gate.loadedAt > 0 && age >= 0 && age <= APP_OPEN_MAX_AGE_MS && canShowAppOpen(gate);
}

export type InterstitialGate = FullScreenGate & {
  matchId: string;
  pendingMatchId: string | null;
  lastAttemptMatchId: string | null;
  matchActive: boolean;
  ready: boolean;
};

/** A prepared post-match ad is consumed only by an explicit replay or exit action. */
export function canShowPostMatchInterstitial(gate: InterstitialGate): boolean {
  return commonAllowed(gate)
    && gate.ready
    && !gate.matchActive
    && gate.matchId.length > 0
    && gate.pendingMatchId === gate.matchId
    && gate.lastAttemptMatchId !== gate.matchId;
}

/** Google Mobile Ads uses error code 3 for no-fill; tolerate native message variants too. */
export function isNoFillError(error: unknown): boolean {
  const e = error as { code?: unknown; message?: unknown } | null | undefined;
  if (e?.code === 3 || e?.code === "3") return true;
  const text = String(e?.message ?? error ?? "").toLowerCase();
  return /no[ _-]?fill|no ad (?:available|to show|loaded)/.test(text);
}

export function noFillRetryAt(error: unknown, now: number): number {
  return isNoFillError(error) ? now + APP_OPEN_NO_FILL_RETRY_MS : 0;
}

/** One owner across every await; simultaneous App Open/Interstitial calls fail closed. */
export function createAdMutex() {
  let active: Promise<boolean> | null = null;
  return (operation: () => Promise<boolean>): Promise<boolean> => {
    if (active) return Promise.resolve(false);
    const current = operation();
    active = current;
    const release = () => { if (active === current) active = null; };
    void current.then(release, release);
    return current;
  };
}
