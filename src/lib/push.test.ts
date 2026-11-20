import { beforeEach, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  native: vi.fn(() => true),
  getMeta: vi.fn(() => ({ pushAsked: false })),
  setMeta: vi.fn(),
  loadMe: vi.fn(async () => ({})),
  getCred: vi.fn(() => ({ id: "player", secret: "test-only" })),
  setPush: vi.fn(async (_arg: { data: { id: string; secret: string; token: string } }) => ({ ok: true })),
  report: vi.fn(),
  requestPermissions: vi.fn(async () => ({ receive: "granted" })),
  checkPermissions: vi.fn(async () => ({ receive: "granted" })),
  register: vi.fn(async () => {}),
  addListener: vi.fn(),
  callbacks: {} as { registration?: (value: { value: string }) => void },
}));

vi.mock("./native", () => ({ isNative: m.native }));
vi.mock("./identity", () => ({ getCred: m.getCred, loadMe: m.loadMe }));
vi.mock("./meta", () => ({ getMeta: m.getMeta, setMeta: m.setMeta }));
vi.mock("./players.functions", () => ({ setPush: m.setPush }));
vi.mock("./report", () => ({ report: m.report }));
vi.mock("@capacitor/push-notifications", () => ({ PushNotifications: m }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  m.requestPermissions.mockResolvedValue({ receive: "granted" });
  m.setPush.mockResolvedValue({ ok: true });
  m.addListener.mockImplementation(async (name: string, callback: (value: { value: string }) => void) => {
    if (name === "registration") m.callbacks.registration = callback;
    return { remove: vi.fn(async () => {}) };
  });
});

it("marks asked only after an actual permission result and coalesces prompts", async () => {
  let finish!: (permission: { receive: string }) => void;
  m.requestPermissions.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const { askPushOnFirstOnline } = await import("./push");
  const first = askPushOnFirstOnline();
  const second = askPushOnFirstOnline();
  await vi.waitFor(() => expect(m.requestPermissions).toHaveBeenCalledTimes(1));
  expect(m.setMeta).not.toHaveBeenCalled();
  finish({ receive: "granted" });
  await Promise.all([first, second]);
  expect(m.setMeta).toHaveBeenCalledWith({ pushAsked: true });
  expect(m.register).toHaveBeenCalledTimes(1);
});

it("records denial without registering", async () => {
  m.requestPermissions.mockResolvedValueOnce({ receive: "denied" });
  await (await import("./push")).askPushOnFirstOnline();
  expect(m.setMeta).toHaveBeenCalledWith({ pushAsked: true });
  expect(m.register).not.toHaveBeenCalled();
});

it("installs listeners only once across foreground registrations", async () => {
  const { resumePush } = await import("./push");
  await resumePush();
  await resumePush();
  expect(m.addListener).toHaveBeenCalledTimes(3);
  expect(m.register).toHaveBeenCalledTimes(2);
  expect(m.requestPermissions).not.toHaveBeenCalled();
});

it("serializes token updates and retries failed uploads", async () => {
  const { resumePush } = await import("./push");
  await resumePush();
  let release!: () => void;
  m.setPush.mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve({ ok: true }); }));
  m.callbacks.registration?.({ value: "old" });
  m.callbacks.registration?.({ value: "new" });
  await vi.waitFor(() => expect(m.setPush).toHaveBeenCalledTimes(1));
  release();
  await vi.waitFor(() => expect(m.setPush).toHaveBeenCalledTimes(2));
  expect(m.setPush.mock.calls.map(([arg]) => arg?.data.token)).toEqual(["old", "new"]);
  m.setPush.mockRejectedValueOnce(new Error("unavailable"));
  m.callbacks.registration?.({ value: "retry" });
  await vi.waitFor(() => expect(m.report).toHaveBeenCalledWith("error", "push_token_update", "Token upload failed"));
  m.callbacks.registration?.({ value: "retry" });
  await vi.waitFor(() => expect(m.setPush).toHaveBeenCalledTimes(4));
});
