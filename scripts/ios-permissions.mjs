import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function configureCamera(plist) {
  const key = '<key>NSCameraUsageDescription</key>';
  const value = '<string>Kameran används för att skanna en vänkod eller en kod till ett schackparti.</string>';
  if (plist.includes(key)) return plist.replace(/(<key>NSCameraUsageDescription<\/key>\s*)<string>[\s\S]*?<\/string>/, `$1${value}`);
  return plist.replace(/<\/dict>\s*<\/plist>/, `\t${key}\n\t${value}\n</dict>\n</plist>`);
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const path = 'ios/App/App/Info.plist';
  if (existsSync(path)) { writeFileSync(path, configureCamera(readFileSync(path, 'utf8'))); console.log('iOS QR camera permission configured.'); }
}