import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowLeft, ArrowUp, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { getDaftAdminAccess, updateDaftQuote } from "@/lib/daftcoin.functions";
import { useCloudDaft } from "@/hooks/use-cloud-daft";
import { useQueryClient } from "@tanstack/react-query";
import { adminCoinSchema } from "@/lib/external-market";

export function ExternalAdminPage() {
  const verify = useServerFn(getDaftAdminAccess);
  const update = useServerFn(updateDaftQuote);
  const queryClient = useQueryClient();
  const [access, setAccess] = useState<"checking" | "signed-out" | "denied" | "admin">("checking");
  const [price, setPrice] = useState("");
  const [trend, setTrend] = useState<"up" | "down">("up");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const market = useCloudDaft();
  const coin = market.coin;
  async function check() {
    setAccess("checking");
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) { setAccess("signed-out"); return; }
      setAccess(await verify() ? "admin" : "denied");
    } catch { setAccess("denied"); }
  }
  useEffect(() => { void check(); }, [verify]);
  const valid = adminCoinSchema.safeParse({ symbol: "DAFT", price: Number(price), trend }).success;
  return <div className="exchange-shell"><header className="markets-header"><div><h1 className="markets-title">Admin</h1><p className="markets-subtitle">Recharge · Withdrawals · Users · DAFT</p></div><Button asChild variant="ghost" size="icon"><Link to="/markets" aria-label="Back to Markets"><ArrowLeft/></Link></Button></header>
    <main className="space-y-6 py-6">
       <div className="flex items-center justify-between border-b border-border pb-4"><div><h2 className="text-lg font-semibold">DaftCoin</h2><p className="text-xs text-muted-foreground">DAFT / USDT · Vertex</p></div><div className="text-right"><p className="text-xl font-semibold">{coin?.price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 8 }) ?? "—"}</p><p className="text-xs text-muted-foreground">{market.status === "live" ? "Connected" : market.status === "loading" ? "Connecting…" : "Delayed / unavailable"}</p></div></div>
      {access !== "admin" && <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"><ShieldCheck className="size-4"/><span>{access === "checking" ? "Checking access…" : access === "signed-out" ? "Sign in to access admin controls." : "Administrator permission required."}</span>{access === "signed-out" && <Button variant="outline" disabled={busy} onClick={async () => { setBusy(true); try { const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/admin` }); if (result.error) setNotice("Sign-in failed"); else await check(); } catch { setNotice("Sign-in unavailable"); } finally { setBusy(false); } }}>Sign in</Button>}<Button variant="ghost" size="icon" aria-label="Check admin access" title="Check admin access" onClick={() => void check()}><RefreshCw/></Button></div>}
       <form className="space-y-5" onSubmit={async e => { e.preventDefault(); if (access !== "admin" || !valid || busy) return; setBusy(true); setNotice(""); try { await update({ data: { action: "set", price: Number(price), trend } }); await queryClient.invalidateQueries({ queryKey: ["cloud-daft-simulation"] }); setNotice("DAFT base price updated."); } catch (e) { setNotice(e instanceof Error ? e.message : "DAFT price unavailable"); } finally { setBusy(false); } }}>
        <label className="trade-field" htmlFor="external-daft-price">Price (USDT)<Input id="external-daft-price" type="number" min="0.00000001" max="1000000" step="any" value={price} onChange={e => setPrice(e.target.value)} disabled={access !== "admin" || busy}/></label>
        <div className="side-toggle" role="group" aria-label="Trend direction"><Button type="button" variant="ghost" className="side-btn side-long" data-active={trend === "up"} aria-pressed={trend === "up"} disabled={access !== "admin" || busy} onClick={() => setTrend("up")}><ArrowUp className="size-4"/>Up</Button><Button type="button" variant="ghost" className="side-btn side-short" data-active={trend === "down"} aria-pressed={trend === "down"} disabled={access !== "admin" || busy} onClick={() => setTrend("down")}><ArrowDown className="size-4"/>Down</Button></div>
        <Button type="submit" className="w-full" disabled={access !== "admin" || !valid || busy}><Save className="size-4"/>{busy ? "Saving…" : "Update DAFT price"}</Button>
       </form><p role="status" className="text-sm text-muted-foreground">{notice || market.message}</p>
    </main></div>;
}
