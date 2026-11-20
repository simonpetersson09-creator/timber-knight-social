import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ allowed: false, register: vi.fn() }));
vi.mock("./native", () => ({
  allowsGameplayRuntime: () => mocks.allowed,
  isNative: () => false,
  platform: () => "web",
}));
vi.mock("./players.functions", () => ({ registerPlayer: mocks.register }));

import { clearIdentity, loadMe } from "./identity";

beforeEach(() => {
  clearIdentity();
  localStorage.clear();
  mocks.register.mockReset();
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
