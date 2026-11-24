import { describe, expect, it } from "vitest";
import { adminFrameHeaders, isAdminDocumentPath } from "./admin-frame";

describe("admin iframe headers", () => {
  it("applies only to admin document paths", () => {
    expect(isAdminDocumentPath("/admin")).toBe(true);
    expect(isAdminDocumentPath("/admin/diagram")).toBe(true);
    expect(isAdminDocumentPath("/administrator")).toBe(false);
    expect(isAdminDocumentPath("/")).toBe(false);
  });

  it("removes framing blocks and preserves other security directives", () => {
    const headers = adminFrameHeaders(new Headers({
      "x-frame-options": "DENY",
      "content-security-policy": "default-src 'self'; frame-ancestors 'none'; object-src 'none'",
    }));
    expect(headers.get("x-frame-options")).toBeNull();
    expect(headers.get("content-security-policy")).toBe("default-src 'self'; object-src 'none'; frame-ancestors *");
  });
});
