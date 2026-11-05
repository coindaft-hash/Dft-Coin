import { createFileRoute } from "@tanstack/react-router";
import { TransferPage } from "@/components/transfer-page";

export const Route = createFileRoute("/transfer")({
  head: () => ({
    meta: [
      { title: "Transfer — Vertex" },
      { name: "description", content: "Send dollars instantly from your Vertex account to another user by email." },
      { property: "og:title", content: "Transfer — Vertex" },
      { property: "og:description", content: "Send dollars instantly to another Vertex user by email." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TransferPage,
});
