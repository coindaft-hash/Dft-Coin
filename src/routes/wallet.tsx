import { createFileRoute, redirect } from "@tanstack/react-router";

// The Wallet tab became the Profile dashboard; this old address forwards there.
export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — Vertex" },
      { name: "description", content: "The Vertex wallet moved to your profile." },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/profile" });
  },
});
