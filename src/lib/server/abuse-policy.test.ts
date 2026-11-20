import { describe, expect, it } from "vitest";
import { ABUSE_QUOTAS, MAX_SERVER_REQUEST_BYTES } from "./abuse-policy";

describe("persistent abuse policy", () => {
  it("allows at most eight failed admin attempts per fifteen minutes", () => {
    expect(ABUSE_QUOTAS.admin_failures).toEqual({ limit: 8, windowSeconds: 900, blockSeconds: 1800 });
  });

  it("allows at most ten registrations per subject and day", () => {
    expect(ABUSE_QUOTAS.register).toEqual({ limit: 10, windowSeconds: 86_400, blockSeconds: 3600 });
  });

  it("rejects oversized server requests before normal handling", () => {
    expect(MAX_SERVER_REQUEST_BYTES).toBe(750_000);
  });
});
