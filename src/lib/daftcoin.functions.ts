import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { daftUpdateSchema } from "@/lib/daftcoin-schema";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Tables } from "@/integrations/supabase/types";
import { simulatedDaftQuote } from "@/lib/daft-simulation";

export type DaftQuote = Tables<"daft_quote">;

export const getDaftQuote = createServerFn({ method: "GET" }).handler(async (): Promise<DaftQuote> => {
  const url = (typeof process !== "undefined" ? process.env["SUPABASE_URL"] : undefined) || import.meta.env["VITE_SUPABASE_URL"];
  const key = (typeof process !== "undefined" ? process.env["SUPABASE_PUBLISHABLE_KEY"] : undefined) || import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    const fallbackBase: DaftQuote = {
      symbol: "DAFT",
      price: 1.8425 as any,
      baseline_price: 1.7650 as any,
      baseline_at: new Date(Date.now() - 86400000).toISOString(),
      trend: "up",
      trend_until: new Date(Date.now() + 86400000).toISOString(),
      updated_at: new Date(Date.now() - 120000).toISOString(),
      version: 1 as any,
    };
    return simulatedDaftQuote(fallbackBase, Math.floor(Date.now() / 2000) * 2000);
  }
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const { data, error } = await client.from("daft_quote").select("symbol,price,baseline_price,baseline_at,trend,trend_until,updated_at,version").eq("symbol", "DAFT").single();
  if (error || !data) {
    const fallbackBase: DaftQuote = {
      symbol: "DAFT",
      price: 1.8425 as any,
      baseline_price: 1.7650 as any,
      baseline_at: new Date(Date.now() - 86400000).toISOString(),
      trend: "up",
      trend_until: new Date(Date.now() + 86400000).toISOString(),
      updated_at: new Date(Date.now() - 120000).toISOString(),
      version: 1 as any,
    };
    return simulatedDaftQuote(fallbackBase, Math.floor(Date.now() / 2000) * 2000);
  }
  return simulatedDaftQuote(data, Math.floor(Date.now() / 2000) * 2000);
});

export const getDaftAdminAccess = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error("Could not verify admin access");
  return data === true;
});

export const updateDaftQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => daftUpdateSchema.parse(input))
  .handler(async ({ data, context }): Promise<DaftQuote> => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !isAdmin) throw new Error("Admin access required");
    const { data: rows, error } = await context.supabase.rpc("update_daft_quote", { _action: data.action, ...(data.price === undefined ? {} : { _price: data.price }), _trend: data.trend });
    if (error || !rows?.[0]) throw new Error("Price update failed. Wait a moment and retry.");
    return rows[0];
  });