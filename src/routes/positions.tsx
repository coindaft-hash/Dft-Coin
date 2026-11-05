import { createFileRoute } from "@tanstack/react-router";
import { PositionsPage } from "@/components/positions-page";

export const Route = createFileRoute("/positions")({
  head: () => ({
    meta: [
      { title: "Positions — Vertex" },
      { name: "description", content: "View open demo positions with margin, liquidation distance, and unrealized PnL on Vertex." },
      { property: "og:title", content: "Positions — Vertex" },
      { property: "og:description", content: "View open demo positions with margin, liquidation distance, and unrealized PnL on Vertex." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PositionsPage,
});
