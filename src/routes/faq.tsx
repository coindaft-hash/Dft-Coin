import { createFileRoute } from "@tanstack/react-router";
import { FaqPage } from "@/components/account-pages";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Vertex" },
      { name: "description", content: "Answers about deposits, withdrawals, transfers, referral rewards and account levels." },
      { property: "og:title", content: "FAQ — Vertex" },
      { property: "og:description", content: "How deposits, withdrawals, transfers and rewards work on Vertex." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FaqPage,
});
