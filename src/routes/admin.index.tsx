import { createFileRoute } from "@tanstack/react-router";
import AdminDashboard from "@/components/AdminDashboard";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin – Mr B Chess" },
      { name: "description", content: "Statistik för Mr B Chess." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin – Mr B Chess" },
      { property: "og:description", content: "Statistik för Mr B Chess." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

function Admin() {
  return <AdminDashboard />;
}
