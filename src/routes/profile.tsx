import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profil – Mr B Chess" },
      { name: "description", content: "Välj namn, avatar och land i Mr B Chess." },
      { property: "og:title", content: "Profil – Mr B Chess" },
      { property: "og:description", content: "Välj namn, avatar och land i Mr B Chess." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() { return <Navigate to="/settings" replace />; }
