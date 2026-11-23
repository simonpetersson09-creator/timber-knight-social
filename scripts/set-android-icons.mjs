/** Copy committed Chess launcher resources into the generated Android project. */
import { cp, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const src = resolve(process.cwd(), "resources/android/res");
const dest = resolve(process.cwd(), "android/app/src/main/res");
if (!existsSync(src)) throw new Error("[Android icons] Run node scripts/make-icons.mjs first");
if (!existsSync(dest)) {
  console.log("[Android icons] Android project is not present; skipping copy");
  process.exit(0);
}
let count = 0;
for (const dir of await readdir(src)) {
  await mkdir(resolve(dest, dir), { recursive: true });
  for (const file of await readdir(resolve(src, dir))) {
    await cp(resolve(src, dir, file), resolve(dest, dir, file));
    count += 1;
  }
}
console.log(`[Android icons] Copied ${count} Mr B Chess launcher files.`);
