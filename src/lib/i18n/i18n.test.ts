import { describe, expect, it } from "vitest";
import { KEYS, LANGUAGES } from "./keys";
import { EUROPE } from "./locales-europe";
import { ASIA } from "./locales-asia";
import { resolveDeviceLang } from "./index";
import { translate } from "./translate";

const ALL = { ...EUROPE, ...ASIA };
describe("translations", () => {
  it("has exactly 40 languages", () => expect(LANGUAGES.length).toBe(40));
  it.each(LANGUAGES.map((l) => l.code))("%s has every text", (code) => {
    expect(ALL[code]?.length).toBe(KEYS.length);
  });
  it("maps device languages", () => {
    expect(resolveDeviceLang(["nb-NO"])).toBe("no");
    expect(resolveDeviceLang(["pt-PT"])).toBe("pt-PT");
    expect(resolveDeviceLang(["sv-SE"])).toBe("sv");
    expect(resolveDeviceLang(["xx"])).toBe("en");
  });
  it("uses oavgjort throughout the Swedish interface", () => {
    expect(translate("sv", "draw")).toBe("Oavgjort");
    expect(translate("sv", "offerDraw")).toBe("Föreslå oavgjort");
    expect(EUROPE["sv"]?.join(" ")).not.toMatch(/remi/i);
  });
});
