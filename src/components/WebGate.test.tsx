import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";

const mocks = vi.hoisted(() => ({ native: false, preview: false, pathname: "/", mounted: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ useLocation: () => ({ pathname: mocks.pathname }), useRouter: () => ({ routesByPath: { "/": {}, "/online": {} } }) }));
vi.mock("@/lib/native", () => ({ isNative: () => mocks.native, isPreviewHost: () => mocks.preview }));
vi.mock("@/components/BrandIcon", () => ({ BrandIcon: () => null }));
vi.mock("@/components/StoreButtons", () => ({ StoreButtons: () => null }));

import { WebGate } from "./WebGate";

function ProtectedChild() {
  useEffect(() => { mocks.mounted(); }, []);
  return <p>Protected game</p>;
}

beforeEach(() => {
  mocks.native = false;
  mocks.preview = false;
  mocks.pathname = "/";
  mocks.mounted.mockReset();
  localStorage.clear();
});

it("never mounts a protected game route on the gated public website", async () => {
  render(<I18nProvider><WebGate><ProtectedChild /></WebGate></I18nProvider>);
  expect(screen.queryByText("Protected game")).toBeNull();
  await screen.findByText(/Mr B Chess is played in the app|Mr B Chess spelas i appen/);
  expect(mocks.mounted).not.toHaveBeenCalled();
});

it.each(["/ONLINE", "/online/"])("fails closed before mounting protected content at %s", async (pathname) => {
  mocks.pathname = pathname;
  render(<I18nProvider><WebGate><ProtectedChild /></WebGate></I18nProvider>);
  expect(mocks.mounted).not.toHaveBeenCalled();
  await screen.findByText(/Mr B Chess is played in the app|Mr B Chess spelas i appen/);
  expect(mocks.mounted).not.toHaveBeenCalled();
});

it("mounts the protected route after preview runtime resolution", async () => {
  mocks.preview = true;
  render(<I18nProvider><WebGate><ProtectedChild /></WebGate></I18nProvider>);
  await screen.findByText("Protected game");
  expect(mocks.mounted).toHaveBeenCalledTimes(1);
});
