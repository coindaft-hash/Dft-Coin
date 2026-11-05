import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { depositInput } from "./deposits";

export const listDeposits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("deposit_submissions").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(20);
    if (error) throw new Error("Deposit history unavailable.");
    return data;
  });

export const verifyDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => depositInput.parse(input))
  .handler(async ({ data, context }) => {
    // Server-authenticated ownership only. Clients cannot insert or modify verification results.
    const { data: existing, error: readError } = await context.supabase.from("deposit_submissions").select("*").eq("user_id", context.userId).eq("network", data.network).eq("tx_hash", data.txHash).maybeSingle();
    if (readError) throw new Error("Deposit records unavailable.");
    if (existing && (existing.status === "credited" || existing.message === "Rejected by admin")) return existing;
    if (existing && Date.now() - new Date(existing.checked_at).getTime() < 20_000) return existing;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: limitError } = await supabaseAdmin.from("deposit_submissions").select("id", { count: "exact", head: true }).eq("user_id", context.userId).gte("checked_at", new Date(Date.now() - 60_000).toISOString());
    if (limitError) throw new Error("Deposit records unavailable.");
    if ((count ?? 0) >= 3) throw new Error("Please wait a minute before checking another transaction.");
    const { inspectDeposit } = await import("./deposits.server");
    const check = await inspectDeposit(data);
    const { data: record, error } = await supabaseAdmin.from("deposit_submissions").upsert({ user_id: context.userId, network: data.network, tx_hash: data.txHash, expected_amount: existing?.expected_amount ?? data.amount, ...check, checked_at: new Date().toISOString() }, { onConflict: "user_id,network,tx_hash" }).select("*").single();
    if (error) throw new Error("Unable to save the deposit check. No balance credited.");
    return record;
  });