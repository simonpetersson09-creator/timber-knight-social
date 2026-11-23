/**
 * Regenerate all Mr B Chess launcher icons from resources/icon.png.
 * Usage: node scripts/make-icons.mjs [source.png]
 * Requires ImageMagick 7 (`magick`) and Python 3 with Pillow/numpy.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROOT = process.cwd();
const MASTER = join(ROOT, "resources", "icon.png");
const ANDROID_RES = join(ROOT, "resources", "android", "res");
const IOS_SET = join(ROOT, "resources", "ios", "AppIcon.appiconset");
const PUBLIC = join(ROOT, "public");
const run = (args) => execFileSync("magick", args, { stdio: "inherit" });

function render(src, out, size, { circle = false, alpha = false } = {}) {
  mkdirSync(dirname(out), { recursive: true });
  const args = [src, "-colorspace", "sRGB", "-resize", `${size}x${size}`];
  if (circle) {
    const c = size / 2;
    args.push("(", "-size", `${size}x${size}`, "xc:none", "-fill", "white", "-draw", `circle ${c},${c} ${c},0`, ")", "-compose", "DstIn", "-composite");
  }
  args.push(...(alpha ? ["-alpha", "set"] : ["-alpha", "off"]), out);
  run(args);
}

const source = process.argv[2];
if (source) {
  const src = resolve(ROOT, source);
  if (!existsSync(src)) throw new Error(`[icons] Source not found: ${src}`);
  mkdirSync(dirname(MASTER), { recursive: true });
  run([src, "-colorspace", "sRGB", "-resize", "1024x1024!", "-alpha", "off", MASTER]);
}
if (!existsSync(MASTER)) throw new Error("[icons] resources/icon.png is missing");

for (const [dpi, size] of [["mdpi", 48], ["hdpi", 72], ["xhdpi", 96], ["xxhdpi", 144], ["xxxhdpi", 192]]) {
  const dir = join(ANDROID_RES, `mipmap-${dpi}`);
  render(MASTER, join(dir, "ic_launcher.png"), size);
  render(MASTER, join(dir, "ic_launcher_round.png"), size, { circle: true, alpha: true });
}
execFileSync("python3", [join(ROOT, "scripts", "make-android-foreground.py"), MASTER], { stdio: "inherit" });
for (const name of ["ic_launcher.xml", "ic_launcher_round.xml"]) {
  const dir = join(ANDROID_RES, "mipmap-anydpi-v26");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n`);
}
mkdirSync(join(ANDROID_RES, "values"), { recursive: true });
writeFileSync(join(ANDROID_RES, "values", "ic_launcher_background.xml"), '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#032732</color>\n</resources>\n');

rmSync(IOS_SET, { recursive: true, force: true });
mkdirSync(IOS_SET, { recursive: true });
const iosIcons = [
  [20, 2, "iphone"], [20, 3, "iphone"], [29, 2, "iphone"], [29, 3, "iphone"],
  [40, 2, "iphone"], [40, 3, "iphone"], [60, 2, "iphone"], [60, 3, "iphone"],
  [20, 1, "ipad"], [20, 2, "ipad"], [29, 1, "ipad"], [29, 2, "ipad"],
  [40, 1, "ipad"], [40, 2, "ipad"], [76, 1, "ipad"], [76, 2, "ipad"], [83.5, 2, "ipad"],
];
const images = [];
for (const [pt, scale, idiom] of iosIcons) {
  const name = `icon_${pt}x${pt}@${scale}x.png`;
  render(MASTER, join(IOS_SET, name), Math.round(pt * scale));
  images.push({ size: `${pt}x${pt}`, idiom, scale: `${scale}x`, filename: name });
}
render(MASTER, join(IOS_SET, "icon_1024x1024@1x.png"), 1024);
images.push({ size: "1024x1024", idiom: "ios-marketing", scale: "1x", filename: "icon_1024x1024@1x.png" });
writeFileSync(join(IOS_SET, "Contents.json"), `${JSON.stringify({ images, info: { version: 1, author: "xcode" } }, null, 2)}\n`);

render(MASTER, join(PUBLIC, "app-icon-1024.png"), 1024);
render(MASTER, join(PUBLIC, "app-icon.png"), 512);
render(MASTER, join(PUBLIC, "apple-touch-icon.png"), 180);
render(MASTER, join(PUBLIC, "favicon.png"), 64);
console.log(`[icons] Mr B Chess icons regenerated from resources/icon.png (${Math.round(readFileSync(MASTER).length / 1024)} kB).`);
