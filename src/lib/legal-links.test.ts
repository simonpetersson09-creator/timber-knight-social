import { describe, expect, it } from "vitest";
import { ADMOB_APP_ADS_LINE, PRIVACY_POLICY_LABEL, PRIVACY_POLICY_URL, SUPPORT_EMAIL } from "./legal-links";
import { readFileSync } from "node:fs";
import { translate } from "./i18n/translate";

describe("privacy policy link", () => {
  it("points at the published Mr B Chess privacy page", () => {
    expect(PRIVACY_POLICY_URL).toBe("https://mrbchess-privacy.lovable.app");
  });

  it("is an https URL without a trailing slash", () => {
    expect(PRIVACY_POLICY_URL.startsWith("https://")).toBe(true);
    expect(PRIVACY_POLICY_URL.endsWith("/")).toBe(false);
    expect(new URL(PRIVACY_POLICY_URL).host).toBe("mrbchess-privacy.lovable.app");
  });

  it("shows the page's own host as link text", () => {
    expect(PRIVACY_POLICY_LABEL).toBe("mrbchess-privacy.lovable.app");
    expect(PRIVACY_POLICY_URL.endsWith(PRIVACY_POLICY_LABEL)).toBe(true);
  });

  it("uses the verified support address and Chess AdMob publisher record", () => {
    expect(SUPPORT_EMAIL).toBe("simon@shiningdays.se");
    expect(readFileSync("public/app-ads.txt", "utf8").trim()).toBe(ADMOB_APP_ADS_LINE);
    expect(ADMOB_APP_ADS_LINE).toContain("pub-7448540924654868");
  });

  it("describes completion telemetry and every actual ad format without hiding deletion", () => {
    expect(translate("sv", "legalPrivacy2")).toContain("Viktiga spelhändelser");
    expect(translate("sv", "legalPrivacy2")).toContain("banner på snabbspelssöksidan");
    expect(translate("sv", "legalPrivacy2")).toContain("Spela igen, Hem eller tillbaka");
    expect(translate("en", "legalPrivacy2")).toContain("Important game events");
    expect(translate("en", "legalPrivacy2")).toContain("quick-match search screen");
    expect(translate("sv", "legalPrivacy3")).toContain("Radera mina data");
  });
});
