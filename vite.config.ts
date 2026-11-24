// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const capacitorOffline = process.env["CAPACITOR_OFFLINE"] === "1";

export default defineConfig({
  // Outside Lovable, Nitro auto-detects the host and may otherwise emit .output/public instead.
  // Pin only the native offline build; the normal hosted build keeps its existing target.
  ...(capacitorOffline ? {
    nitro: {
      preset: "cloudflare-module",
      output: { dir: "dist", serverDir: "dist/server", publicDir: "dist/client" },
      cloudflare: { nodeCompat: true, deployConfig: true },
    },
  } : {}),
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // Capacitor needs a real HTML entry point; client routing handles every app page locally.
    ...(capacitorOffline ? {
      pages: [{ path: "/" }],
      prerender: { enabled: true, autoStaticPathsDiscovery: false, crawlLinks: false },
    } : {}),
  },
});
