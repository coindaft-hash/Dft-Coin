import { createFileRoute } from "@tanstack/react-router";
import { VipPage } from "@/components/account-pages";

export const Route = createFileRoute("/vip")({
  head: () => ({
    meta: [
      { title: "VIP Level — Vertex" },
      { name: "description", content: "See your Vertex membership level and what balance you need for the next one." },
      { property: "og:title", content: "VIP Level — Vertex" },
      { property: "og:description", content: "Your membership level and the path to the next one." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VipPage,
});
