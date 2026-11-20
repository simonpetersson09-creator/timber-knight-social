import { QueryClient } from "@tanstack/react-query";
import { createRootRoute, createRouter, createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { renderToString } from "react-dom/server";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/report", () => ({ report: vi.fn() }));
vi.mock("@/lib/lovable-error-reporting", () => ({ reportLovableError: vi.fn() }));
import { Route } from "@/routes/__root";

describe("Server-rendered root boundaries", () => {
  it("renders an unknown route without a browser document", async () => {
    vi.stubGlobal("document", undefined);
    try {
      const router = createRouter({ routeTree: Route, history: createMemoryHistory({ initialEntries: ["/missing-page"] }), context: { queryClient: new QueryClient() } });
      await router.load();
      const html = renderToString(<RouterProvider router={router} />);
      expect(html).toContain("404");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("renders a loader failure without a browser document", async () => {
    const failedRoute = createRootRoute({
      loader: () => { throw new Error("isolated boundary failure"); },
      errorComponent: Route.options.errorComponent,
    });
    vi.stubGlobal("document", undefined);
    try {
      const router = createRouter({ routeTree: failedRoute, history: createMemoryHistory({ initialEntries: ["/"] }) });
      await router.load();
      const html = renderToString(<RouterProvider router={router} />);
      expect(html).toContain("Försök igen");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("uses the device language for an early client error", async () => {
    const languages = vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-US"]);
    const language = vi.spyOn(navigator, "language", "get").mockReturnValue("en-US");
    localStorage.setItem("mrbchess.settings.v1", JSON.stringify({ lang: "auto", sound: true, haptics: true }));
    const failedRoute = createRootRoute({
      loader: () => { throw new Error("isolated client boundary failure"); },
      errorComponent: Route.options.errorComponent,
    });
    try {
      const router = createRouter({ routeTree: failedRoute, history: createMemoryHistory({ initialEntries: ["/"] }) });
      await router.load();
      render(<RouterProvider router={router} />);
      expect(await screen.findByText("Try again")).toBeTruthy();
    } finally {
      languages.mockRestore();
      language.mockRestore();
    }
  });
});