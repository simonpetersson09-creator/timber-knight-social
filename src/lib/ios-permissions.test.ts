import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
it("QR scanner gets iOS camera permission automatically and idempotently", async () => {
  const { configureCamera } = await import(/* @vite-ignore */ "../../scripts/ios-permissions.mjs");
  const input = '<plist><dict><key>CFBundleName</key><string>Chess</string></dict></plist>';
  const output = configureCamera(input);
  expect(output).toContain('<key>NSCameraUsageDescription</key>');
  expect(configureCamera(output)).toBe(output);
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const hooks =
    'node scripts/ios-permissions.mjs && node scripts/ios-ads.mjs && node scripts/ios-localize.mjs && node scripts/android-ads.mjs && node scripts/set-ios-icons.mjs && node scripts/set-android-icons.mjs';
  expect(pkg.scripts['capacitor:sync:after']).toBe(hooks);
  expect(pkg.scripts['capacitor:copy:after']).toBe(hooks);
  expect(pkg.scripts['native:android']).toBe('bunx cap sync android');
});