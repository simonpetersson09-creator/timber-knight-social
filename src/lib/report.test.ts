import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("./players.functions", () => ({ reportEvent: mocks.send }));
vi.mock("./identity", () => ({ loadMe: async () => ({}), getCred: () => ({ id: "device", secret: "device-secret" }) }));
import { report, reportOnce, flushReports } from "./report";
beforeEach(() => { localStorage.clear(); mocks.send.mockReset(); });
it("keeps failed reports and retries the same ID without duplicating delivery", async () => {
  mocks.send.mockRejectedValueOnce(new Error("offline"));
  report("ad", "interstitial_dismissed");
  await vi.waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(1));
  const first = mocks.send.mock.calls[0]?.[0].data;
  expect(first.secret).toBe("device-secret");
  expect(JSON.parse(localStorage.getItem("mrbchess.reports.v1") ?? "[]")).toHaveLength(1);
  mocks.send.mockResolvedValue({ ok: true });
  await flushReports();
  expect(mocks.send.mock.calls[1]?.[0].data.eventId).toBe(first.eventId);
  expect(JSON.parse(localStorage.getItem("mrbchess.reports.v1") ?? "[]")).toHaveLength(0);
});

it("queues an online game milestone only once across repeated screen loads", async () => {
  mocks.send.mockRejectedValue(new Error("offline"));
  const detail = JSON.stringify({ game: "game-1", kind: "lobby" });
  reportOnce("play", "online_game_started", detail, "online-started:game-1");
  reportOnce("play", "online_game_started", detail, "online-started:game-1");
  await vi.waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(1));
  const events = JSON.parse(localStorage.getItem("mrbchess.reports.v1") ?? "[]") as { name: string }[];
  expect(events.filter((event) => event.name === "online_game_started")).toHaveLength(1);
});