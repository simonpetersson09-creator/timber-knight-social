import { describe, expect, it } from "vitest";

const EMPTY_PLIST = '<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict><key>NSCameraUsageDescription</key><string>Behåll kameran</string></dict></plist>';

describe("iOS AdMob configuration", () => {
  it("sets the Chess App-ID and ATT permission copy", async () => {
    const { ATT_COPY, IOS_ADMOB_APP_ID, configureAds } = await import(/* @vite-ignore */ "../../scripts/ios-ads.mjs");
    const plist = configureAds(EMPTY_PLIST);
    expect(IOS_ADMOB_APP_ID).toBe("ca-app-pub-7448540924654868~9129867558");
    expect(plist).toContain(`<key>GADApplicationIdentifier</key>\n  <string>${IOS_ADMOB_APP_ID}</string>`);
    expect(plist).toContain("<key>NSUserTrackingUsageDescription</key>");
    expect(plist).toContain(ATT_COPY);
  });
  it("includes Google's SKAdNetwork IDs and preserves camera permission", async () => {
    const { SKADNETWORK_IDS, configureAds } = await import(/* @vite-ignore */ "../../scripts/ios-ads.mjs");
    const plist = configureAds(EMPTY_PLIST);
    expect(SKADNETWORK_IDS.length).toBeGreaterThanOrEqual(50);
    for (const id of SKADNETWORK_IDS) expect(plist).toContain(`<string>${id}</string>`);
    expect(plist).toContain("<string>Behåll kameran</string>");
  });
  it("is idempotent and updates an incorrect existing App-ID", async () => {
    const { IOS_ADMOB_APP_ID, configureAds } = await import(/* @vite-ignore */ "../../scripts/ios-ads.mjs");
    const once = configureAds(EMPTY_PLIST).replace(IOS_ADMOB_APP_ID, "ca-app-pub-wrong~123");
    const twice = configureAds(configureAds(once));
    expect(twice).toBe(configureAds(once));
    expect(twice.match(/<key>GADApplicationIdentifier<\/key>/g)).toHaveLength(1);
    expect(twice.match(/<key>NSUserTrackingUsageDescription<\/key>/g)).toHaveLength(1);
    expect(twice.match(/<key>SKAdNetworkItems<\/key>/g)).toHaveLength(1);
    expect(twice).not.toContain("ca-app-pub-wrong~123");
  });
});
