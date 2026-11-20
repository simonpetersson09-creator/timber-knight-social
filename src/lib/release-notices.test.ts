import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("release notice references", () => {
  it("retains engine source, network and GPL references", () => {
    const source = read("public/engine/SOURCE.md");
    for (const required of [
      "https://github.com/nmrugg/stockfish.js",
      "https://github.com/official-stockfish/Stockfish",
      "31a98753a5d932511693f44775da908377c24513",
      "v18.0.0",
      "nn-9067e33176e8.nnue",
      "/engine/COPYING.txt",
      "corresponding-source",
      "unverified",
    ]) expect(source).toContain(required);
    const license = read("public/engine/COPYING.txt");
    expect(license).toContain("GNU GENERAL PUBLIC LICENSE");
    expect(license).toContain("Version 3, 29 June 2007");
    expect(license).toContain("END OF TERMS AND CONDITIONS");
  });

  it("covers media and fonts without treating metadata as rights evidence", () => {
    const notices = read("THIRD_PARTY_NOTICES.md");
    for (const required of [
      "public/engine/SOURCE.md", "public/pieces/", "wood-light.jpg", "wood-dark.jpg",
      "chess-mascot.png.asset.json", "Inter", "Bodoni Moda", "Space Grotesk",
      "SIL Open Font License 1.1", "unverified", "not legal certification",
    ]) expect(notices).toContain(required);
  });
});
