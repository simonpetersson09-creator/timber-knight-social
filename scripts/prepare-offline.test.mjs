import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { findOfflineSource, prepareOffline } from "./prepare-offline.mjs";

const pointers = {
  "stockfish-wasm.asset.json": { url: "/__l5e/assets-v1/test/stockfish.wasm", size: 4 },
  "chess-mascot.png.asset.json": { url: "/__l5e/assets-v1/test/mascot.png", size: 4 },
};

async function fixture(layout) {
  const root = await mkdtemp(path.join(tmpdir(), "chess-offline-"));
  const output = path.join(root, layout);
  await mkdir(path.join(root, "src", "assets"), { recursive: true });
  await mkdir(path.join(output, "engine"), { recursive: true });
  await mkdir(path.join(output, "assets"), { recursive: true });
  await mkdir(path.join(root, "public", "pieces"), { recursive: true });
  await mkdir(path.join(output, "pieces"), { recursive: true });
  await writeFile(path.join(output, "index.html"), "<!doctype html><script type=\"module\" src=\"/assets/app.js\"></script>");
  await writeFile(path.join(output, "assets", "app.js"), "// local app");
  await writeFile(path.join(output, "engine", "stockfish.js"), "// local engine");
  await writeFile(path.join(root, "public", "pieces", "wP.webp"), "pawn");
  await writeFile(path.join(output, "pieces", "wP.webp"), "pawn");
  for (const [name, pointer] of Object.entries(pointers)) {
    await writeFile(path.join(root, "src", "assets", name), JSON.stringify(pointer));
    const target = path.join(output, pointer.url);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, "data");
  }
  return root;
}

for (const layout of ["dist/client", ".output/public"]) {
  test(`prepares a complete Capacitor app from ${layout}`, async () => {
    const root = await fixture(layout);
    try {
      assert.equal(await findOfflineSource(root), path.join(root, layout));
      await prepareOffline(root);
      assert.match(await readFile(path.join(root, ".output", "public", "index.html"), "utf8"), /assets\/app\.js/);
      assert.equal(await readFile(path.join(root, ".output", "public", "engine", "stockfish.js"), "utf8"), "// local engine");
      assert.equal(await readFile(path.join(root, ".output", "public", "pieces", "wP.webp"), "utf8"), "pawn");
      assert.equal(await readFile(path.join(root, ".output", "public", "assets", "app.js"), "utf8"), "// local app");
      for (const pointer of Object.values(pointers)) {
        assert.equal(await readFile(path.join(root, ".output", "public", pointer.url), "utf8"), "data");
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test("rejects a build without prerendered HTML", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chess-offline-empty-"));
  try {
    await assert.rejects(findOfflineSource(root), /dist\/client or \.output\/public/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
