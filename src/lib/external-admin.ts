import { adminCoinSchema, MARKET_SERVER_URL } from "@/lib/external-market";
import { supabase } from "@/integrations/supabase/client";

export async function controlExternalCoin(input: unknown) {
  const data = adminCoinSchema.parse(input);
  const { data: user, error } = await supabase.auth.getUser();
  if (error || !user.user) throw new Error("Sign in required");
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.access_token || session.session.user.id !== user.user.id) throw new Error("Session expired");
  const response = await fetch(`${MARKET_SERVER_URL}/api/admin/control-coin`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session.access_token}` },
    body: JSON.stringify(data), signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Admin request denied by market server" : `Price update failed: HTTP ${response.status}`);
  // Success never invents a new quote: the authoritative socket event supplies it.
}
