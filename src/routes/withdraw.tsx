import { createFileRoute } from "@tanstack/react-router";
import { WithdrawPage } from "@/components/withdraw-page";

export const Route = createFileRoute("/withdraw")({
  head: () => ({
    meta: [
      { title: "Withdraw — Vertex" },
      { name: "description", content: "Request a USDT withdrawal on BSC or Ethereum and track its status." },
      { property: "og:title", content: "Withdraw — Vertex" },
      { property: "og:description", content: "Request a USDT withdrawal and follow its status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WithdrawPage,
});
