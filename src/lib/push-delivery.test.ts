import { describe, expect, it } from "vitest";
import { canClearPushToken, pushRetrySeconds, shouldInvalidatePushToken, shouldRetryPush } from "./push-delivery";

describe("push delivery rules", () => {
  it("invalidates only provider-confirmed stale tokens", () => {
    expect(shouldInvalidatePushToken(400)).toBe(true);
    expect(shouldInvalidatePushToken(404)).toBe(true);
    expect(shouldInvalidatePushToken(401)).toBe(false);
    expect(shouldInvalidatePushToken(500)).toBe(false);
  });

  it("retries network, throttling and server failures but not other client failures", () => {
    expect(shouldRetryPush(null)).toBe(true);
    expect(shouldRetryPush(429)).toBe(true);
    expect(shouldRetryPush(503)).toBe(true);
    expect(shouldRetryPush(403)).toBe(false);
  });

  it("uses bounded exponential retry delays", () => {
    expect(pushRetrySeconds(1)).toBe(30);
    expect(pushRetrySeconds(2)).toBe(60);
    expect(pushRetrySeconds(8)).toBe(3600);
  });

  it("never clears a newer token because an older delivery failed", () => {
    expect(canClearPushToken("new-token", "old-token")).toBe(false);
    expect(canClearPushToken("old-token", "old-token")).toBe(true);
    expect(canClearPushToken(null, "old-token")).toBe(false);
  });
});
