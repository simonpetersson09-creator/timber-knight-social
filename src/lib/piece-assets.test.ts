import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const kinds = ["k", "q", "b", "n", "r", "p"];

function asset(color: "w" | "b", kind: string) {
  return readFileSync(resolve(process.cwd(), `public/pieces/${color}${kind}.webp`));
}

describe("Mr B Signature pieces", () => {
  it("provides twelve optimized, nonempty WebP renders", () => {
    for (const color of ["w", "b"] as const) {
      for (const kind of kinds) {
        const data = asset(color, kind);
        expect(data.subarray(0, 4).toString("ascii"), `${color}${kind}`).toBe("RIFF");
        expect(data.subarray(8, 12).toString("ascii"), `${color}${kind}`).toBe("WEBP");
        expect(data.byteLength, `${color}${kind}`).toBeGreaterThan(5000);
        expect(data.byteLength, `${color}${kind}`).toBeLessThan(30000);
      }
    }
  });

  it("uses the realistic renders through the shared piece component", () => {
    const component = readFileSync(resolve(process.cwd(), "src/components/Piece.tsx"), "utf8");
    expect(component).toContain("/pieces/${color}${type}.webp");
    expect(component).not.toContain(".svg");
  });
});
