import { beforeEach, describe, expect, it, vi } from "vitest";

const native = { value: true };
const request = vi.fn();
const platformFetch = vi.fn();

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native.value },
  CapacitorHttp: { request: (...args: unknown[]) => request(...args) },
}));

import { APP_SERVER_ORIGIN, appServerFetch, bundledServerUrl } from "./app-server";

describe("bundled app server functions", () => {
  beforeEach(() => {
    native.value = true;
    request.mockReset();
    platformFetch.mockReset();
    vi.stubGlobal("fetch", platformFetch);
  });

  it("sends bundled native RPC to the published backend through native HTTP", async () => {
    request.mockResolvedValue({ status: 200, headers: { "content-type": "application/json" }, data: '{"ok":true}' });
    const response = await appServerFetch("/_serverFn/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"data":{}}',
    });

    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      url: `${APP_SERVER_ORIGIN}/_serverFn/register`,
      method: "POST",
      data: '{"data":{}}',
      responseType: "text",
      headers: expect.objectContaining({ origin: APP_SERVER_ORIGIN }),
    }));
    expect(platformFetch).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ ok: true });
  });

  it("keeps ordinary hosted browser requests unchanged", async () => {
    native.value = false;
    platformFetch.mockResolvedValue(new Response("ok"));
    await appServerFetch("/_serverFn/register", { method: "POST" });
    expect(platformFetch).toHaveBeenCalledWith("/_serverFn/register", { method: "POST" });
    expect(request).not.toHaveBeenCalled();
  });

  it("keeps the normal published native shell on same-origin browser fetch", () => {
    expect(bundledServerUrl("/_serverFn/register", APP_SERVER_ORIGIN)).toBeNull();
  });

  it("never treats protocol-relative URLs as local RPC paths", () => {
    expect(bundledServerUrl("//example.com/_serverFn/register")).toBeNull();
  });
});
