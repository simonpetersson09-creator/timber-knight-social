import { describe, expect, it } from "vitest";
import { cleanName, displayName, isOnline } from "./profile";
describe("profile", () => {
  it("allows names up to 20 characters", () => expect(cleanName("a".repeat(20))).toBe("a".repeat(20)));
  it("rejects names over 20 characters", () => expect(() => cleanName("a".repeat(21))).toThrow());
  it("empty name means nameless", () => expect(cleanName("   ")).toBeNull());
  it("nameless players show their player number", () => expect(displayName({ name: null, player_number: 42 })).toBe("#42"));
  it("online if seen within 2 minutes", () => {
    const now = Date.now();
    expect(isOnline(new Date(now - 60_000).toISOString(), now)).toBe(true);
    expect(isOnline(new Date(now - 180_000).toISOString(), now)).toBe(false);
  });
});
