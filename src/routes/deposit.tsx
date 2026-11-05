import { createFileRoute } from "@tanstack/react-router";
import { DepositPage } from "@/components/wallet-page";

export const Route = createFileRoute("/deposit")({
  head: () => ({
    meta: [
      { title: "Deposit USDT — Vertex" },
      { name: "description", content: "Deposit USDT on BSC BEP20 or Ethereum ERC20 to your Vertex account and submit your transaction ID for verification." },
      { property: "og:title", content: "Deposit USDT — Vertex" },
      { property: "og:description", content: "Deposit USDT on BSC BEP20 or Ethereum ERC20 and submit your transaction ID for verification." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DepositPage,
});
