import { createFileRoute } from "@tanstack/react-router";
import { WalletManagementPage } from "@/components/account-pages";

export const Route = createFileRoute("/wallet-management")({
  head: () => ({
    meta: [
      { title: "Wallet Management — Vertex" },
      { name: "description", content: "Check your balance and save the USDT address used for withdrawals." },
      { property: "og:title", content: "Wallet Management — Vertex" },
      { property: "og:description", content: "Balance, saved withdrawal address and quick actions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WalletManagementPage,
});
