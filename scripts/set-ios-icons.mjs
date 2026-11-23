/** Copy the committed Chess icon set into the generated Xcode project. */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const src = resolve(process.cwd(), "resources", "ios", "AppIcon.appiconset");
const catalog = resolve(process.cwd(), "ios", "App", "App", "Assets.xcassets");
const dest = join(catalog, "AppIcon.appiconset");
if (!existsSync(src)) throw new Error("[iOS icons] Run node scripts/make-icons.mjs first");
if (!existsSync(catalog)) {
  console.log("[iOS icons] Xcode project is not present; skipping copy");
  process.exit(0);
}
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
for (const file of readdirSync(src)) cpSync(join(src, file), join(dest, file));
console.log(`[iOS icons] Copied ${readdirSync(src).length} Mr B Chess icon files.`);
