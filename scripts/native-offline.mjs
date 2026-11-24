import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareOffline } from "./prepare-offline.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const env = { ...process.env, CAPACITOR_OFFLINE: "1" };

async function run(script, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { cwd: root, env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Native offline step failed (${signal ?? code}): ${path.basename(script)} ${args.join(" ")}`));
    });
  });
}

// Do not let output from another target satisfy the build accidentally.
await Promise.all([
  rm(path.join(root, "dist"), { recursive: true, force: true }),
  rm(path.join(root, ".output"), { recursive: true, force: true }),
]);

console.log("Native offline build: CAPACITOR_OFFLINE=1");
await run(path.join(root, "node_modules", "vite", "bin", "vite.js"), ["build"]);
await prepareOffline(root);
await run(path.join(root, "node_modules", "@capacitor", "cli", "bin", "capacitor"), ["sync"]);
