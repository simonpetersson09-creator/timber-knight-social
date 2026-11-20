import { describe, expect, it } from "vitest";
import { PRIVACY_POLICY_LABEL, PRIVACY_POLICY_URL } from "./legal-links";

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
});
