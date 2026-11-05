import { createFileRoute } from "@tanstack/react-router";
import { AiTradeFrame } from "@/components/ai-trade-frame";

export const Route = createFileRoute("/ai-trade")({
  head: () => ({ meta: [
    { title: "AI Trade — Vertex" },
    { name: "description", content: "AI Trade on Vertex: 15-day (1.7%), 25-day (1.9%), and 30-day (2.2%) daily automated profit." },
    { property: "og:title", content: "AI Trade — Vertex" },
    { property: "og:description", content: "AI Trade on Vertex: 15-day (1.7%), 25-day (1.9%), and 30-day (2.2%) daily automated profit." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AiTradeFrame,
});
