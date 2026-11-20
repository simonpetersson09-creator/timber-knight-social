import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  removeServer: vi.fn(), clearIdentity: vi.fn(), pause: vi.fn(), cred: { id: "player", secret: "secret" },
}));
vi.mock("./players.functions", () => ({ deleteMyData: mocks.removeServer }));
vi.mock("./identity", () => ({ clearIdentity: mocks.clearIdentity, getCred: () => mocks.cred }));
vi.mock("./report", () => ({ setReportingPaused: mocks.pause }));

import { deleteAllMyData } from "./delete-data";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear(); sessionStorage.clear();
  mocks.removeServer.mockResolvedValue({ ok: true });
  mocks.clearIdentity.mockResolvedValue(undefined);
  localStorage.setItem("mrbchess.games.v1", "saved-game");
  localStorage.setItem("IABTCF_PurposeConsents", "10010");
  localStorage.setItem("lovable:iosPreview", "1");
  sessionStorage.setItem("mrbchess.leaderboard.v1.lists", "cached");
});

it("removes Chess data only after server confirmation and preserves consent", async () => {
  await deleteAllMyData();
  expect(mocks.removeServer).toHaveBeenCalledWith({ data: mocks.cred });
  expect(localStorage.getItem("mrbchess.games.v1")).toBeNull();
  expect(sessionStorage.getItem("mrbchess.leaderboard.v1.lists")).toBeNull();
  expect(localStorage.getItem("IABTCF_PurposeConsents")).toBe("10010");
  expect(localStorage.getItem("lovable:iosPreview")).toBe("1");
  expect(mocks.pause).toHaveBeenLastCalledWith(false);
});

it("keeps local data when server deletion fails", async () => {
  mocks.removeServer.mockResolvedValue({ ok: false });
  await expect(deleteAllMyData()).rejects.toThrow("data_delete_failed");
  expect(localStorage.getItem("mrbchess.games.v1")).toBe("saved-game");
  expect(mocks.clearIdentity).not.toHaveBeenCalled();
});

it("retries interrupted cleanup without repeating successful server deletion", async () => {
  mocks.clearIdentity.mockRejectedValueOnce(new Error("secure storage"));
  await expect(deleteAllMyData()).rejects.toThrow("secure storage");
  expect(localStorage.getItem("mrbchess.games.v1")).toBe("saved-game");
  await deleteAllMyData();
  expect(mocks.removeServer).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem("mrbchess.games.v1")).toBeNull();
  expect(mocks.pause).toHaveBeenLastCalledWith(false);
});
