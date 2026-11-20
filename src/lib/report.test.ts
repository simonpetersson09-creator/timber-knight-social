import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ send: vi.fn(), loadMe: vi.fn(async () => ({})), allowed: true }));
vi.mock("./players.functions", () => ({ reportEvent: mocks.send }));
vi.mock("./identity", () => ({ loadMe: mocks.loadMe, getCred: () => ({ id: "device", secret: "device-secret" }) }));
vi.mock("./native", () => ({ allowsGameplayRuntime: () => mocks.allowed }));
import { report, reportOnce, flushReports } from "./report";
beforeEach(() => { localStorage.clear(); mocks.send.mockReset(); mocks.loadMe.mockClear(); mocks.allowed = true; });
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

it("does not register a player or queue gameplay reports on the public website", async () => {
  mocks.allowed = false;
  report("play", "app_opened");
  reportOnce("play", "online_game_started", "game-1", "online-started:game-1");
  await flushReports();
  expect(mocks.loadMe).not.toHaveBeenCalled();
  expect(mocks.send).not.toHaveBeenCalled();
  expect(localStorage.getItem("mrbchess.reports.v1")).toBeNull();
  expect(localStorage.getItem("mrbchess.report-once.v1")).toBeNull();
});

it("retains important events when routine activity exceeds the queue limit", () => {
  const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  try {
    report("error", "app_render_error", "important");
    for (let i = 0; i < 110; i++) report("play", "settings_opened", String(i));
    const events = JSON.parse(localStorage.getItem("mrbchess.reports.v1") ?? "[]") as { name: string }[];
    expect(events).toHaveLength(100);
    expect(events.some((event) => event.name === "app_render_error")).toBe(true);
  } finally { online.mockRestore(); }
});

it("delivers errors before older routine events", async () => {
  mocks.send.mockResolvedValue({ ok: true });
  report("play", "settings_opened");
  report("error", "app_render_error");
  await vi.waitFor(() => expect(mocks.send).toHaveBeenCalled());
  expect(mocks.send.mock.calls[0]?.[0].data.name).toBe("app_render_error");
  await vi.waitFor(() => expect(JSON.parse(localStorage.getItem("mrbchess.reports.v1") ?? "[]")).toHaveLength(0));
});

it("recovers from malformed queue and once-marker storage", () => {
  const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  try {
    localStorage.setItem("mrbchess.reports.v1", "{}");
    localStorage.setItem("mrbchess.report-once.v1", "null");
    report("play", "settings_opened");
    reportOnce("play", "online_game_started", "game-1", "online-started:game-1");
    expect(JSON.parse(localStorage.getItem("mrbchess.reports.v1") ?? "[]")).toHaveLength(2);
    expect(JSON.parse(localStorage.getItem("mrbchess.report-once.v1") ?? "[]")).toEqual(["online-started:game-1"]);
  } finally { online.mockRestore(); }
});