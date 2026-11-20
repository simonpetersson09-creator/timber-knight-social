import { describe, expect, it } from "vitest";
import { ADMIN_SESSION_SECONDS, isAdminSession } from "./admin-session";

describe("admin session", () => {
  it("expires after 30 minutes", () => {
    expect(ADMIN_SESSION_SECONDS).toBe(1800);
  });

  it("accepts only the server-issued admin marker", () => {
    expect(isAdminSession({})).toBe(false);
    expect(isAdminSession({ admin: false })).toBe(false);
    expect(isAdminSession({ admin: true })).toBe(true);
  });
});
