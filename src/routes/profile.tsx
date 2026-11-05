import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/components/profile-page";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Vertex" },
      { name: "description", content: "Your Vertex profile: balance, deposit and withdrawal records, team and account tools." },
      { property: "og:title", content: "Profile — Vertex" },
      { property: "og:description", content: "Balance, records, team and account tools in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});
