import { describe, expect, it } from "vitest";
import { LANGUAGES } from "./i18n/keys";
// @ts-expect-error plain ESM build script
import { PROMPTS, patchProject } from "../../scripts/ios-localize.mjs";

describe("iOS system prompts", () => {
  it("cover every app language with both camera and tracking text", () => {
    const expected = LANGUAGES.map((l) => (l.code === "no" ? "nb" : l.code)).sort();
    expect(Object.keys(PROMPTS).sort()).toEqual(expected);
    for (const [cam, att] of Object.values(PROMPTS) as [string, string][]) { expect(cam.length).toBeGreaterThan(10); expect(att.length).toBeGreaterThan(10); }
  });
  it("patches the Xcode project only once", () => {
    const base = "/* End PBXFileReference section */\n/* End PBXBuildFile section */\n\t\t\t\t504EC3131FED79650016851F /* Info.plist */,\n504EC30D1FED79650016851F /* Main.storyboard in Resources */,\n/* End PBXVariantGroup section */\nknownRegions = (\n en,\n);";
    const once = patchProject(base, ["en", "sv"]);
    expect(patchProject(once, ["en", "sv"])).toBe(once);
  });
});
