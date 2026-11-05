import { createFileRoute, redirect } from "@tanstack/react-router";
import { ExchangeHome } from "@/components/exchange-home";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        let hasLocal = false;
        try {
          hasLocal = typeof window !== "undefined" && Boolean(localStorage.getItem("vx-mock-user"));
        } catch {}
        if (!hasLocal) {
          throw redirect({ to: "/login" });
        }
      }
    } catch (err) {
      if ((err as any)?.to) throw err;
    }
  },
  head: () => ({ meta: [
    { title: "Home — Vertex Crypto & Forex" },
    { name: "description", content: "View your portfolio, crypto prices, and forex market snapshot with Vertex." },
    { property: "og:title", content: "Home — Vertex Crypto & Forex" },
    { property: "og:description", content: "Your portfolio and global markets in one clear overview." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ExchangeHome,
});
