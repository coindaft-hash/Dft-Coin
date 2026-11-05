import { createFileRoute } from "@tanstack/react-router";
import { SupportPage } from "@/components/account-pages";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — Vertex" },
      { name: "description", content: "Current status of deposits, withdrawals and market prices, plus where to get help." },
      { property: "og:title", content: "Support — Vertex" },
      { property: "og:description", content: "Service status and how to reach support." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportPage,
});
