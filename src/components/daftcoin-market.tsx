import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useHydrated } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { daftQuoteOptions } from "@/lib/daftcoin-query";
import { type DaftQuote } from "@/lib/daftcoin.functions";
import daftLogo from "@/assets/daftcoin.png";

const priceText = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 8 });

export function DaftCoinMarket({ initialQuote, query, watchlistOnly, saved, onToggle }: { initialQuote: DaftQuote | null; query: string; watchlistOnly: boolean; saved: boolean; onToggle: () => void }) {
  const client = useQueryClient();
  const hydrated = useHydrated();
  const { data: quote, isError, isPending } = useQuery({ ...daftQuoteOptions, ...(initialQuote ? { initialData: initialQuote } : {}), refetchInterval: 30_000 });
  const [details, setDetails] = useState(false);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let active = true;
    const channel = supabase.channel("daft-market")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "daft_quote" }, payload => {
        const row = payload.new as DaftQuote;
        client.setQueryData(daftQuoteOptions.queryKey, (previous: DaftQuote | undefined) => !previous || row.version >= previous.version ? row : previous);
      }).subscribe(status => { if (active) setConnected(status === "SUBSCRIBED"); });
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [client]);

  const change = quote ? (quote.price / quote.baseline_price - 1) * 100 : null;
  const changeText = change === null ? "—" : `${change >= 0 ? "+" : "−"}${Math.abs(change).toFixed(2)}%`;
  const updated = quote && hydrated ? new Date(quote.updated_at).toLocaleTimeString() : "—";
  const matches = "daftcoin daft/usdt".includes(query.trim().toLowerCase()) && (!watchlistOnly || saved);
  const state = isPending ? "Connecting…" : isError ? quote ? "Delayed · last saved" : "Unavailable" : connected ? "Realtime" : "Synced";

  return <>
    {matches && <div className="asset-table-row">
        <Button variant="ghost" className="asset-detail-trigger" aria-label="View DAFT/USDT details" onClick={() => setDetails(true)}>
          <span className="coin-identity"><img src={daftLogo} width={48} height={48} alt="" className="coin-icon"/><span className="asset-name-block"><span className="pair-name">DAFT<span className="pair-quote"> / USDT</span></span><span className="coin-name">DaftCoin</span></span></span>
          <span className="market-price">{quote ? priceText(quote.price) : "—"}<span className="market-volume">Vertex</span></span>
          <span className={`change ${change !== null && change < 0 ? "negative" : ""}`}>{changeText}</span>
        </Button>
        <Button variant="ghost" size="icon" className="watchlist-star" onClick={onToggle} aria-label={`${saved ? "Remove DAFT/USDT from" : "Add DAFT/USDT to"} watchlist`} aria-pressed={saved} title="DaftCoin watchlist"><Star className={saved ? "star-filled" : ""}/></Button>
    </div>}
    <Dialog.Root open={details} onOpenChange={setDetails}><Dialog.Portal><Dialog.Overlay className="market-detail-overlay"/><Dialog.Content className="market-detail-dialog"><div className="market-detail-top"><span className="daft-test-label">VERTEX · ADMIN-SET</span><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close DaftCoin details"><X/></Button></Dialog.Close></div><div className="flex items-center gap-3"><img src={daftLogo} alt="" width={48} height={48} className="daft-logo"/><div><Dialog.Title className="text-xl font-bold">DaftCoin</Dialog.Title><Dialog.Description className="text-xs text-muted-foreground">DAFT / USDT</Dialog.Description></div></div><div className="detail-price"><div className="text-daft">{quote ? priceText(quote.price) : "—"}<span>USDT</span></div><p className={`detail-change ${change !== null && change < 0 ? "negative" : ""}`}>{changeText}<span>24h baseline change</span></p></div><dl className="detail-facts"><div><dt>Price source</dt><dd>Vertex</dd></div><div><dt>Trend</dt><dd>{quote?.trend ?? "—"}</dd></div><div><dt>Feed</dt><dd>{state}</dd></div><div><dt>Last updated</dt><dd>{updated}</dd></div><div><dt>Bid / ask</dt><dd>Not available</dd></div></dl><Button variant="outline" onClick={onToggle}><Star/>{saved ? "Remove from watchlist" : "Add to watchlist"}</Button></Dialog.Content></Dialog.Portal></Dialog.Root>
  </>;
}