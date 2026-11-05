import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Bell, Search, Star, X, ShieldCheck, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNavigation } from "@/components/bottom-navigation";
import { cryptoAssetList } from "@/lib/external-market";
import { AssetIcon } from "@/components/asset-icon";
import { filterSampleAssets, sampleAssets, type SampleAsset } from "@/lib/market-samples";
import { useLiveCrypto, type FeedStatus } from "@/hooks/use-live-crypto";
import { useLiveForex } from "@/hooks/use-live-forex";
import { formatPrice } from "@/lib/demo-candles";
import type { LiveQuote } from "@/lib/crypto-prices.functions";

const forexPairs = sampleAssets.filter(a => a.category === "Forex").map(a => a.pair);
const forexText = (status: FeedStatus, source?: string): string => ({ loading: "Connecting…", live: `Live · ${source ?? "ER-API"}`, delayed: "Delayed", rate_limited: "Rate limited", error: "Disconnected" })[status];
const cryptoSymbols = sampleAssets.filter(a => a.category === "Crypto").map(a => a.symbol);
const statusText: Record<FeedStatus, string> = { loading: "Connecting…", live: "Live", delayed: "Delayed", rate_limited: "Rate limited", error: "Disconnected" };
// Show the feed actually in use — Binance first, Bybit/OKX when the exchange blocks the server.
const statusLabel = (status: FeedStatus, source?: string) => status === "live" ? `Live · ${source ?? "Binance"}` : statusText[status];
type View = { price: string; change: string; negative: boolean; note: string; quote?: LiveQuote };
function viewFor(asset: SampleAsset, quotes: Record<string, LiveQuote & { closed?: boolean }>, status: FeedStatus): View {
  const fx = asset.category === "Forex";
  const q = quotes[fx ? asset.pair : asset.symbol];
  if (!q) return { price: "—", change: "—", negative: false, note: status === "loading" ? "Loading…" : status === "live" || status === "delayed" ? (fx ? "Awaiting refresh" : "Unavailable from server") : "Unavailable" };
  if (fx) { const pct = q.open24h > 0 ? ((q.last - q.open24h) / q.open24h) * 100 : NaN; return { price: formatPrice(q.last), change: Number.isFinite(pct) ? `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(2)}%` : "—", negative: pct < 0, note: q.closed ? "Market closed" : status === "live" ? "Live" : forexText(status), quote: q }; }
  const pct = q.open24h > 0 ? ((q.last - q.open24h) / q.open24h) * 100 : NaN;
  return { price: formatPrice(q.last), change: Number.isFinite(pct) ? `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(2)}%` : "—", negative: pct < 0, note: status === "live" ? "Live" : statusText[status], quote: q };
}
const time = (t: number | null) => t ? new Date(t).toLocaleTimeString() : "—";


export function MarketsPage() {
  const [category, setCategory] = useState("Crypto");
  const [query, setQuery] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [selected, setSelected] = useState<SampleAsset | null>(null);
  const crypto = useLiveCrypto(cryptoSymbols);
  const serverAssets = cryptoAssetList(crypto.coins as any);
  const assets = category === "Crypto" ? serverAssets.filter(a => `${a.pair} ${a.name}`.toLowerCase().includes(query.trim().toLowerCase()) && (!watchlistOnly || watchlist.includes(a.pair))) : filterSampleAssets(category, query, watchlistOnly, watchlist);
  const resultCount = assets.length;
  const forex = useLiveForex(forexPairs);
  const feedFor = (c: string, symbol?: string) => c === "Forex" ? forex : symbol === "DAFT" ? { ...crypto, status: crypto.daftStatus, message: crypto.daftMessage } : crypto;
  const feed = feedFor(category);
  const sv = selected ? viewFor(selected, feedFor(selected.category, selected.symbol).quotes, feedFor(selected.category, selected.symbol).status) : null;
  function toggleWatchlist(pair: string) {
    setWatchlist(previous => previous.includes(pair) ? previous.filter(item => item !== pair) : [...previous, pair]);
  }
  return <div className="exchange-shell markets-page">
    <header className="exchange-header"><div className="brand"><svg className="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M3 7h7l6 13 6-13h7L16 30 3 7Z" fill="currentColor"/><path d="m12 3 4 8 4-8h-8Z" fill="currentColor"/></svg><span>vertex<span className="text-primary">.</span></span></div><div className="flex items-center gap-4"><Bell className="size-5 text-muted-foreground" strokeWidth={1.7} aria-label="Notifications"/><div className="account-avatar" aria-label="Account">JD</div></div></header>
    <main>
      <div className="welcome"><div className="min-w-0"><h1>Markets</h1><p>Crypto &amp; major currency pairs</p></div><span className="demo-label shrink-0"><span className="status-dot" data-status={feed.status}/>{category === "Forex" ? forexText(feed.status, forex.source) : statusLabel(feed.status, crypto.source)}</span></div>
      <div className="market-search"><Search className="size-4" aria-hidden="true"/><Input type="search" aria-label="Search markets" placeholder="Search symbol or asset name" value={query} onChange={event => setQuery(event.target.value)}/>{query && <Button variant="ghost" size="icon" aria-label="Clear search" onClick={() => setQuery("")}><X/></Button>}</div>
      <div className="market-controls"><div className="market-tabs" role="tablist" aria-label="Market category">{["Crypto", "Forex"].map(tab => <Button key={tab} variant="ghost" role="tab" id={`tab-${tab}`} aria-controls="market-results" aria-selected={category === tab} className="market-tab" data-active={category === tab} onClick={() => setCategory(tab)}>{tab}</Button>)}</div><Button variant="ghost" className="watchlist-filter" aria-pressed={watchlistOnly} data-active={watchlistOnly} onClick={() => setWatchlistOnly(!watchlistOnly)}><Star className={watchlistOnly ? "star-filled" : ""}/><span>Watchlist</span><span className="watchlist-count">{watchlist.length}</span></Button></div>
      <div className="market-results-heading"><span>{watchlistOnly ? "Your watchlist" : `${category} pairs`}</span><span>{resultCount} {resultCount === 1 ? "pair" : "pairs"}</span></div>
      <div id="market-results" role="tabpanel" aria-labelledby={`tab-${category}`}>
        <div className="asset-table-header"><span>Asset</span><span>Last price</span><span>24h change</span><span className="sr-only">Watchlist</span></div>
        {assets.map(asset => { const v = viewFor(asset, feed.quotes, asset.category === "Crypto" ? crypto.statusFor(asset.symbol) : feed.status); return <div className="asset-table-row" key={asset.pair}><Button variant="ghost" className="asset-detail-trigger" aria-label={`View ${asset.pair} details`} onClick={() => setSelected(asset)}><span className="coin-identity"><AssetIcon asset={asset}/><span className="asset-name-block"><span className="pair-name">{asset.symbol}<span className="pair-quote"> / {asset.quote}</span></span><span className="coin-name truncate">{asset.name}</span></span></span><span className="market-price">{v.price}<span className="market-volume">{asset.symbol === "DAFT" ? `Vertex · ${crypto.daftStatus === "live" ? "Live" : crypto.daftStatus === "delayed" ? "Delayed" : "Unavailable"}` : v.quote ? asset.quote : v.note}</span></span><span className={`change ${v.negative ? "negative" : ""} ${v.quote ? "" : "change-muted"}`}>{v.change}</span></Button><Button variant="ghost" size="icon" className="watchlist-star" aria-label={`${watchlist.includes(asset.pair) ? "Remove" : "Add"} ${asset.pair} ${watchlist.includes(asset.pair) ? "from" : "to"} watchlist`} aria-pressed={watchlist.includes(asset.pair)} onClick={() => toggleWatchlist(asset.pair)} title={watchlist.includes(asset.pair) ? "Remove from watchlist" : "Add to watchlist"}><Star className={watchlist.includes(asset.pair) ? "star-filled" : ""}/></Button></div>; })}
        {resultCount === 0 && <div className="markets-empty"><Search className="size-6 text-muted-foreground"/><h2>{query ? "No matching markets" : !watchlistOnly && category === "Crypto" ? feed.status === "loading" ? "Connecting to market server" : "Coin list unavailable" : "No saved pairs"}</h2><p>{query ? `No ${category.toLowerCase()} pairs match “${query}”.` : !watchlistOnly && category === "Crypto" ? "Waiting for your local market server." : `Your ${category.toLowerCase()} watchlist is empty.`}</p><Button variant="outline" size="sm" onClick={() => { setQuery(""); setWatchlistOnly(false); }}>Show all {category.toLowerCase()} pairs</Button></div>}
      </div>
      <div className="sample-disclosure"><ShieldCheck className="size-4 shrink-0"/><div><strong>{`${category}: ${category === "Forex" ? forexText(feed.status, forex.source) : statusLabel(feed.status, crypto.source)}`}</strong><p>{category === "Forex" ? <>Forex rates from {forex.source} — a keyless reference feed, so rate limits cannot blank the list. Change vs. previous close. Bid/ask not provided. Last updated {time(feed.updatedAt)}.{feed.message && <> {feed.message}</>}</> : <>Crypto prices from {crypto.source ?? "Binance"} (Binance first, Bybit/OKX fallback). DAFT prices are served by Vertex. Last updated {time(feed.updatedAt)}.{feed.message && <> {feed.message}</>} DAFT: {crypto.daftStatus === "live" ? "Connected" : crypto.daftStatus === "delayed" ? "Delayed" : "Disconnected"}.</>}</p></div></div>
    </main>
    <Dialog.Root open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}><Dialog.Portal><Dialog.Overlay className="market-detail-overlay"/><Dialog.Content className="market-detail-dialog">{selected && sv && <><div className="market-detail-top"><span className="demo-label"><span className="status-dot" data-status={feedFor(selected.category, selected.symbol).status}/>{sv?.quote ? (selected.symbol === "DAFT" ? `Vertex · ${crypto.daftStatus === "live" ? "Connected" : crypto.daftStatus === "delayed" ? "Delayed" : "Disconnected"}` : (selected.category === "Forex" ? forexText(feedFor(selected.category, selected.symbol).status, forex.source) : statusLabel(feedFor(selected.category, selected.symbol).status, crypto.source))) : "Unavailable"}</span><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close market details"><X/></Button></Dialog.Close></div><div className="flex items-center gap-3"><AssetIcon asset={selected}/><div className="min-w-0"><Dialog.Title className="text-xl font-bold">{selected.pair}</Dialog.Title><Dialog.Description className="mt-1 text-xs text-muted-foreground">{selected.name}</Dialog.Description></div></div><div className="detail-price"><span className="text-xs text-muted-foreground">Last price</span><div>{sv.price}<span>{sv.quote ? selected.quote : sv.note}</span></div>{sv.quote && <p className={`detail-change ${sv.negative ? "negative" : ""}`}>{sv.negative ? <ArrowDownRight className="size-4"/> : <ArrowUpRight className="size-4"/>}{sv.change}<span>24 hours</span></p>}</div><dl className="detail-facts"><div><dt>Market</dt><dd>{selected.category}</dd></div><div><dt>Base asset</dt><dd>{selected.symbol}</dd></div><div><dt>Quote currency</dt><dd>{selected.quote}</dd></div>{sv.quote && Number.isFinite(sv.quote.bid) && <><div><dt>Bid</dt><dd>{formatPrice(sv.quote.bid)}</dd></div><div><dt>Ask</dt><dd>{formatPrice(sv.quote.ask)}</dd></div></>}<div><dt>Data source</dt><dd>{sv.quote ? (selected.category === "Forex" ? forex.source : selected.symbol === "DAFT" ? "Vertex" : crypto.source) : sv.note}</dd></div><div><dt>Last updated</dt><dd>{sv.quote ? time(sv.quote.ts) : "—"}</dd></div></dl><Button variant={watchlist.includes(selected.pair) ? "secondary" : "default"} onClick={() => toggleWatchlist(selected.pair)}><Star className={watchlist.includes(selected.pair) ? "star-filled" : ""}/>{watchlist.includes(selected.pair) ? "Remove from watchlist" : "Add to watchlist"}</Button><p className="text-center text-[10px] text-muted-foreground">Market data for information only. No trading is executed.</p></>}</Dialog.Content></Dialog.Portal></Dialog.Root>
    <BottomNavigation active="Markets"/>
  </div>;
}