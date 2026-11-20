import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const ANDROID_ADMOB_APP_ID = 'ca-app-pub-7448540924654868~3769729660';
export const AD_ID_PERMISSION = 'com.google.android.gms.permission.AD_ID';
export const ADMOB_METADATA_NAME = 'com.google.android.gms.ads.APPLICATION_ID';

function upsertPermission(manifest, name) {
  const expression = new RegExp(`<uses-permission\\b(?=[^>]*\\bandroid:name=["']${name}["'])[^>]*/>`);
  if (expression.test(manifest)) return manifest;
  return manifest.replace(/\s*<application\b/, `\n    <uses-permission android:name="${name}" />\n\n    <application`);
}

function upsertMetadata(manifest, name, value) {
  const entry = `<meta-data android:name="${name}" android:value="${value}" />`;
  const expression = new RegExp(`<meta-data\\b(?=[^>]*\\bandroid:name=["']${name}["'])[^>]*(?:/>|>[\\s\\S]*?<\\/meta-data>)`);
  if (expression.test(manifest)) return manifest.replace(expression, entry);
  return manifest.replace(/\s*<\/application>/, `\n        ${entry}\n    </application>`);
}

export function configureAndroidAds(manifest) {
  let next = upsertPermission(manifest, AD_ID_PERMISSION);
  next = upsertMetadata(next, ADMOB_METADATA_NAME, ANDROID_ADMOB_APP_ID);
  return next;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const path = 'android/app/src/main/AndroidManifest.xml';
  if (existsSync(path)) {
    const configured = configureAndroidAds(readFileSync(path, 'utf8'));
    writeFileSync(path, configured);
    for (const required of [ANDROID_ADMOB_APP_ID, AD_ID_PERMISSION, ADMOB_METADATA_NAME, 'android.permission.INTERNET']) {
      if (!configured.includes(required)) throw new Error(`Android ad configuration missing: ${required}`);
    }
    console.log('Android AdMob App-ID and AD_ID permission configured.');
  }
}
