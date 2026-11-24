import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const SERVER_ORIGIN = "https://timber-knight-social.lovable.app";

async function exists(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

/** Copies the actual client build where Capacitor expects it and verifies offline-critical assets. */
export async function prepareOffline(root = process.cwd()) {
  const source = path.join(root, "dist", "client");
  const destination = path.join(root, ".output", "public");
  const sourceIndex = path.join(source, "index.html");
  if (!(await exists(sourceIndex))) {
    throw new Error("Offline build failed: dist/client/index.html is missing. Build with CAPACITOR_OFFLINE=1.");
  }

  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true });

  // Lovable asset pointers are hosted paths, so include every referenced binary in the native bundle.
  const pointerFiles = ["stockfish-wasm.asset.json", "chess-mascot.png.asset.json"];
  const required = ["index.html", "engine/stockfish.js"];
  for (const pointerFile of pointerFiles) {
    const pointer = JSON.parse(await readFile(path.join(root, "src", "assets", pointerFile), "utf8"));
    if (typeof pointer.url !== "string" || !pointer.url.startsWith("/__l5e/assets-v1/")) {
      throw new Error(`Offline build failed: invalid asset path in ${pointerFile}.`);
    }
    const assetDestination = path.join(destination, pointer.url);
    if (!(await exists(assetDestination))) {
      const response = await fetch(new URL(pointer.url, SERVER_ORIGIN));
      if (!response.ok) throw new Error(`Offline build failed: ${pointerFile} download returned ${response.status}.`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength !== pointer.size) {
        throw new Error(`Offline build failed: ${pointerFile} size ${bytes.byteLength} does not match ${pointer.size}.`);
      }
      await mkdir(path.dirname(assetDestination), { recursive: true });
      await writeFile(assetDestination, bytes);
    }
    required.push(pointer.url.slice(1));
  }

  for (const file of required) {
    if (!(await exists(path.join(destination, file)))) throw new Error(`Offline build failed: .output/public/${file} is missing.`);
  }
  console.log(`Capacitor offline app ready: .output/public (${required.join(", ")})`);
}

if (process.env.CAPACITOR_OFFLINE === "1") {
  if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
    await prepareOffline();
  }
}
