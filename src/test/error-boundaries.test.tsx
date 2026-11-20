import { QueryClient } from "@tanstack/react-query";
import { createRootRoute, createRouter, createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
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
});