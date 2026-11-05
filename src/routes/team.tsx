import { createFileRoute } from "@tanstack/react-router";
import { TeamPage } from "@/components/team-page";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "My Team — Vertex" },
      { name: "description", content: "View your Vertex team across levels A–D, credited referral rewards, funded members and invitation details." },
      { property: "og:title", content: "My Team — Vertex" },
      { property: "og:description", content: "Your team levels A–D, member counts and credited referral rewards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamPage,
});
