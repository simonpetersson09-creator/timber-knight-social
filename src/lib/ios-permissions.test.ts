import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
it("QR scanner gets iOS camera permission automatically and idempotently", async () => {
  const { configureCamera } = await import(/* @vite-ignore */ "../../scripts/ios-permissions.mjs");
  const input = '<plist><dict><key>CFBundleName</key><string>Chess</string></dict></plist>';
  const output = configureCamera(input);
  expect(output).toContain('<key>NSCameraUsageDescription</key>');
  expect(configureCamera(output)).toBe(output);
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  expect(pkg.scripts['capacitor:sync:after']).toBe('node scripts/ios-permissions.mjs');
});