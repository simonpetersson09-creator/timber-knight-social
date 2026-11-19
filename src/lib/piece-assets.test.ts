import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const kinds = ["k", "q", "b", "n", "r", "p"];
const palettes = {
  w: ["#a9a28f", "#ddd7c6", "#fffdf0", "#ddd7c6", "#d2c9b4", "#8f8879"],
  b: ["#090b0c", "#1a1e20", "#3e4648", "#202527", "#080a0b", "#090b0c"],
};

function asset(color: keyof typeof palettes, kind: string) {
  return readFileSync(resolve(process.cwd(), `public/pieces/${color}${kind}.svg`), "utf8");
}

describe("Mr B Signature pieces", () => {
  it("keeps the exact ivory and ebony gradient colors on all twelve pieces", () => {
    for (const color of ["w", "b"] as const) {
      for (const kind of kinds) {
        const stops = [...asset(color, kind).matchAll(/stop-color="([^"]+)"/g)].map((match) => match[1]);
        expect(stops, `${color}${kind}`).toEqual(palettes[color]);
      }
    }
  });

  it("gives both kings the tilted hat and every piece the signature swept base", () => {
    for (const color of ["w", "b"] as const) {
      expect(asset(color, "k")).toContain('transform="rotate(-8 45 25)"');
      for (const kind of kinds) expect(asset(color, kind)).toContain("M18 95C31 100 53 96 66 88");
    }
  });
});
