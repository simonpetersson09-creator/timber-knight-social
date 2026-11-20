import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ allowed: false, native: false, register: vi.fn(), remove: vi.fn(), setPrefix: vi.fn() }));
vi.mock("./native", () => ({
  allowsGameplayRuntime: () => mocks.allowed,
  isNative: () => mocks.native,
  platform: () => "web",
}));
vi.mock("./players.functions", () => ({ registerPlayer: mocks.register }));
vi.mock("@aparajita/capacitor-secure-storage", () => ({ SecureStorage: { remove: mocks.remove, setKeyPrefix: mocks.setPrefix } }));

import { clearIdentity, loadMe } from "./identity";

beforeEach(async () => {
  mocks.native = false;
  await clearIdentity();
  localStorage.clear();
  mocks.register.mockReset();
  mocks.remove.mockReset().mockResolvedValue(undefined);
  mocks.setPrefix.mockReset().mockResolvedValue(undefined);
  mocks.allowed = false;
});

it("never creates an identity or registers a player on the public website", async () => {
  await expect(loadMe()).rejects.toThrow("app_required");
  expect(mocks.register).not.toHaveBeenCalled();
  expect(localStorage.getItem("mrbchess.identity.v1")).toBeNull();
});

it("still allows player registration in the supported preview", async () => {
  mocks.allowed = true;
  mocks.register.mockResolvedValue({ name: "Preview player" });
  await expect(loadMe()).resolves.toEqual({ name: "Preview player" });
  expect(mocks.register).toHaveBeenCalledTimes(1);
});

it("waits for native secure-storage removal and propagates failures", async () => {
  mocks.native = true;
  mocks.remove.mockRejectedValue(new Error("native_remove_failed"));
  await expect(clearIdentity()).rejects.toThrow("native_remove_failed");
  expect(mocks.setPrefix).toHaveBeenCalledWith("mrbchess.");
  expect(mocks.remove).toHaveBeenCalledWith("mrbchess.identity.v1");
});
