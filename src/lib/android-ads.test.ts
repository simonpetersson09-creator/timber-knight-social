import { describe, expect, it } from "vitest";

const MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:label="Mr B Chess">
        <activity android:name=".MainActivity" />
    </application>
    <uses-permission android:name="android.permission.INTERNET" />
</manifest>`;

describe("Android AdMob configuration", () => {
  it("adds the Chess application ID and required AD_ID permission", async () => {
    const { ANDROID_ADMOB_APP_ID, AD_ID_PERMISSION, ADMOB_METADATA_NAME, configureAndroidAds } = await import(/* @vite-ignore */ "../../scripts/android-ads.mjs");
    const manifest = configureAndroidAds(MANIFEST);
    expect(ANDROID_ADMOB_APP_ID).toBe("ca-app-pub-7448540924654868~3769729660");
    expect(manifest).toContain(`android:name="${ADMOB_METADATA_NAME}" android:value="${ANDROID_ADMOB_APP_ID}"`);
    expect(manifest).toContain(`android:name="${AD_ID_PERMISSION}"`);
    expect(manifest).toContain('android:name="android.permission.INTERNET"');
    expect(manifest).toContain('android:name=".MainActivity"');
  });
  it("is idempotent and replaces an incorrect existing application ID", async () => {
    const { ANDROID_ADMOB_APP_ID, AD_ID_PERMISSION, ADMOB_METADATA_NAME, configureAndroidAds } = await import(/* @vite-ignore */ "../../scripts/android-ads.mjs");
    const wrong = MANIFEST.replace("</application>", `<meta-data\n            android:name="${ADMOB_METADATA_NAME}"\n            android:value="ca-app-pub-wrong~123" />\n    </application>`);
    const once = configureAndroidAds(wrong);
    const twice = configureAndroidAds(once);
    expect(twice).toBe(once);
    expect(twice).not.toContain("ca-app-pub-wrong~123");
    expect(twice.match(new RegExp(ADMOB_METADATA_NAME, "g"))).toHaveLength(1);
    expect(twice.match(new RegExp(AD_ID_PERMISSION.replaceAll(".", "\\."), "g"))).toHaveLength(1);
  });
});
