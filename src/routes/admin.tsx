import { createFileRoute, Outlet, retainSearchParams } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>): { hub_token?: string } => (
    typeof search["hub_token"] === "string" ? { hub_token: search["hub_token"] } : {}
  ),
  search: { middlewares: [retainSearchParams(["hub_token"])] },
  component: AdminLayout,
});

function AdminLayout() {
  return <Outlet />;
}
