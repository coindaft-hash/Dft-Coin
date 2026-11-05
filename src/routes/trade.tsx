import { createFileRoute } from "@tanstack/react-router";
import { TradePage } from "@/components/trade-page";

export const Route = createFileRoute("/trade")({
  head: () => ({ meta: [
    { title: "Trade — Vertex Crypto & Forex" },
    { name: "description", content: "Practice the Vertex trade layout with demo candles, Long/Short, take profit and stop loss. No real orders." },
    { property: "og:title", content: "Trade — Vertex Crypto & Forex" },
    { property: "og:description", content: "Demo trading layout with candlestick chart and order summary. Execution disabled." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: TradePage,
});
