import { describe, expect, it } from "vitest";
import { verifyHubToken } from "./admin-hub";

const encoder = new TextEncoder();
const testSecret = "test-only-hub-secret";

async function sign(exp: number, secret = testSecret): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`mrb-hub:${exp}`));
  return `${exp}.${Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

describe("MrB Admin Hub token", () => {
  it("accepts a valid unexpired token", async () => {
    const now = 1_800_000_000_000;
    const token = await sign(now + 60_000);
    await expect(verifyHubToken(token, testSecret, now)).resolves.toBe(true);
  });

  it("rejects a token with the wrong signature", async () => {
    const now = 1_800_000_000_000;
    const token = await sign(now + 60_000, "wrong-test-secret");
    await expect(verifyHubToken(token, testSecret, now)).resolves.toBe(false);
  });

  it("rejects an expired token even with a valid signature", async () => {
    const now = 1_800_000_000_000;
    const token = await sign(now);
    await expect(verifyHubToken(token, testSecret, now)).resolves.toBe(false);
  });
});
