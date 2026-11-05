import { createFileRoute } from "@tanstack/react-router";
import { MarketsPage } from "@/components/markets-page";

export const Route = createFileRoute("/markets")({
  head: () => ({ meta: [
    { title: "Markets — Vertex Crypto & Forex" },
    { name: "description", content: "Browse live crypto and forex quotes alongside DaftCoin on Vertex." },
    { property: "og:title", content: "Markets — Vertex Crypto & Forex" },
    { property: "og:description", content: "Live exchange quotes, a watchlist, and DaftCoin on Vertex." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: MarketsPage,
});
