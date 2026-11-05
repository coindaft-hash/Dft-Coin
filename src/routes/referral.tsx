import { createFileRoute } from "@tanstack/react-router";
import { ReferralPage } from "@/components/team-page";

export const Route = createFileRoute("/referral")({
  head: () => ({
    meta: [
      { title: "Referral Rewards — Vertex" },
      { name: "description", content: "Share your Vertex invitation code and see the rewards you have earned." },
      { property: "og:title", content: "Referral Rewards — Vertex" },
      { property: "og:description", content: "Your invitation code and referral rewards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReferralPage,
});
