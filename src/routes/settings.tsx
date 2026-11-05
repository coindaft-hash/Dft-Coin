import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/components/account-pages";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Vertex" },
      { name: "description", content: "Update your Vertex name, change your password and manage your session." },
      { property: "og:title", content: "Settings — Vertex" },
      { property: "og:description", content: "Manage your name, password and session." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});
