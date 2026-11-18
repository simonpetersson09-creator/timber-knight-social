import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";

export const Route = createFileRoute("/add")({
  validateSearch: z.object({ code: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Lägg till vän – Mr B Chess" },
      { name: "description", content: "Lägg till en vän i Mr B Chess med vänkod." },
      { property: "og:title", content: "Lägg till vän – Mr B Chess" },
      { property: "og:description", content: "Lägg till en vän i Mr B Chess med vänkod." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AddPage,
});

function AddPage() {
  const { code } = Route.useSearch();
  const navigate = useNavigate();
  useEffect(() => { void navigate({ to: "/friends", search: { code }, replace: true }); }, [code, navigate]);
  return null;
}
