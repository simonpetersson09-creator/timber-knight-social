import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SERVER_ORIGIN = "https://timber-knight-social.lovable.app";

async function exists(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

async function publicFiles(root, directory = path.join(root, "public")) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await publicFiles(root, file));
    else if (entry.isFile()) files.push(path.relative(path.join(root, "public"), file).split(path.sep).join("/"));
  }
  return files;
}

/** Finds the prerendered client in either Lovable's or standalone Nitro's layout. */
export async function findOfflineSource(root = process.cwd()) {
  const candidates = [path.join(root, "dist", "client"), path.join(root, ".output", "public")];
  for (const source of candidates) {
    if (await exists(path.join(source, "index.html"))) return source;
  }
  throw new Error("Offline build failed: no prerendered index.html in dist/client or .output/public. Build with CAPACITOR_OFFLINE=1.");
}

/** Copies the actual client build where Capacitor expects it and verifies offline-critical assets. */
export async function prepareOffline(root = process.cwd()) {
  const source = await findOfflineSource(root);
  const destination = path.join(root, ".output", "public");

  if (path.resolve(source) !== path.resolve(destination)) {
    await rm(destination, { recursive: true, force: true });
    await mkdir(destination, { recursive: true });
    await cp(source, destination, { recursive: true });
  }

  // Lovable asset pointers are hosted paths, so include every referenced binary in the native bundle.
  const pointerFiles = ["stockfish-wasm.asset.json", "chess-mascot.png.asset.json"];
  const required = new Set(["index.html", "engine/stockfish.js", ...await publicFiles(root)]);
  const html = await readFile(path.join(destination, "index.html"), "utf8");
  for (const match of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) {
    const pathname = match[1].split(/[?#]/, 1)[0];
    if (path.extname(pathname)) required.add(decodeURIComponent(pathname).slice(1));
  }
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
    required.add(pointer.url.slice(1));
  }

  for (const file of required) {
    if (!(await exists(path.join(destination, file)))) throw new Error(`Offline build failed: .output/public/${file} is missing.`);
  }
  console.log(`Capacitor offline app ready: .output/public (${required.size} files verified; source: ${path.relative(root, source) || "."})`);
}

if (process.env.CAPACITOR_OFFLINE === "1") {
  if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
    await prepareOffline();
  }
}
