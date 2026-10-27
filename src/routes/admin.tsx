import { createFileRoute } from "@tanstack/react-router";
import { AdminPanel } from "@/components/admin/admin-panel";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "এডমিন প্যানেল — Vertex" },
      { name: "description", content: "ভার্টেক্স এক্সচেঞ্জ আধুনিক এডমিন ড্যাশবোর্ড ও ইউজার কন্ট্রোল প্যানেল।" },
      { property: "og:title", content: "এডমিন প্যানেল — Vertex" },
      { property: "og:description", content: "ভার্টেক্স এক্সচেঞ্জ আধুনিক এডমিন ড্যাশবোর্ড।" },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPanel,
});
