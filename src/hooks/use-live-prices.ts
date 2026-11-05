import { sampleAssets, type SampleAsset } from "@/lib/market-samples";
import { useLiveCrypto } from "@/hooks/use-live-crypto";
import { useLiveForex } from "@/hooks/use-live-forex";

// Always request the full lists so every page shares the same server cache.
const CRYPTO = sampleAssets.filter(a => a.category === "Crypto").map(a => a.symbol);
const FOREX = sampleAssets.filter(a => a.category === "Forex").map(a => a.pair);

export type LivePrice = { last: number; bid: number; ask: number; change: number };

export function useLivePrices() {
  const crypto = useLiveCrypto(CRYPTO);
  const forex = useLiveForex(FOREX);
  const get = (asset: Pick<SampleAsset, "category" | "symbol" | "pair">): LivePrice | null => {
    const q = asset.category === "Forex" ? forex.quotes[asset.pair] : crypto.quotes[asset.symbol];
    if (!q || !(q.last > 0)) return null;
    if (asset.category === "Crypto" && (crypto.statusFor(asset.symbol) !== "live" || Date.now() - q.ts > 45_000)) return null;
    if (asset.category === "Forex" && (forex.status !== "live" || Date.now() - q.ts > 360_000 || forex.quotes[asset.pair]?.closed)) return null;
    return { last: q.last, bid: q.bid, ask: q.ask, change: q.open24h > 0 ? ((q.last - q.open24h) / q.open24h) * 100 : NaN };
  };
  const getDisplay = (asset: Pick<SampleAsset, "category" | "symbol" | "pair">): LivePrice | null => {
    const q = asset.category === "Forex" ? forex.quotes[asset.pair] : crypto.quotes[asset.symbol];
    if (!q || !Number.isFinite(q.last) || q.last <= 0) return null;
    return { last: q.last, bid: q.bid, ask: q.ask, change: q.open24h > 0 ? ((q.last - q.open24h) / q.open24h) * 100 : NaN };
  };
  return { get, getDisplay, crypto, forex };
}

export function fmtLive(v: number) {
  const d = v >= 1000 ? 2 : v >= 1 ? 4 : v >= 0.01 ? 6 : 8;
  return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
