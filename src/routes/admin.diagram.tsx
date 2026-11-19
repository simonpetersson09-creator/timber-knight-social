import { createFileRoute } from "@tanstack/react-router";
import AdminDashboard from "@/components/AdminDashboard";

export const Route = createFileRoute("/admin/diagram")({
  head: () => ({
    meta: [
      { title: "Admindiagram – Mr B Chess" },
      { name: "description", content: "Diagram över Mr B Chess statistik." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admindiagram – Mr B Chess" },
      { property: "og:description", content: "Diagram över Mr B Chess statistik." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminDiagram,
});

function AdminDiagram() {
  return <AdminDashboard diagram />;
}
