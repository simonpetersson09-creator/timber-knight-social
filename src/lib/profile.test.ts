import { describe, expect, it } from "vitest";
import { anonDigits, cleanName, displayName, guessCountry, isOnline } from "./profile";
describe("profile", () => {
  it("allows names up to 20 characters", () => expect(cleanName("a".repeat(20))).toBe("a".repeat(20)));
  it("rejects names over 20 characters", () => expect(() => cleanName("a".repeat(21))).toThrow());
  it("empty name means nameless", () => expect(cleanName("   ")).toBeNull());
  it("nameless players get a name with 4 digits", () => expect(displayName({ name: null, player_number: 42 })).toMatch(/^Spelare \d{4}$/));
  it("default digits are unique per player", () => {
    const seen = new Set(Array.from({ length: 9000 }, (_, i) => anonDigits(i + 1)));
    expect(seen.size).toBe(9000);
  });
  it("country is guessed from device language", () => expect(guessCountry(["sv-SE"], null)).toBe("SE"));
  it("country falls back to time zone", () => expect(guessCountry(["sv"], "Europe/Stockholm")).toBe("SE"));
  it("online if seen within 2 minutes", () => {
    const now = Date.now();
    expect(isOnline(new Date(now - 60_000).toISOString(), now)).toBe(true);
    expect(isOnline(new Date(now - 180_000).toISOString(), now)).toBe(false);
  });
});
