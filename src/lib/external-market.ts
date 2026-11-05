import { z } from "zod";
import type { SampleAsset } from "@/lib/market-samples";
import { sampleAssets } from "@/lib/market-samples";

export const MARKET_SERVER_URL = import.meta.env["VITE_MARKET_SERVER_URL"] || "http://localhost:5000";
export const adminCoinSchema = z.object({ symbol: z.literal("DAFT"), price: z.number().finite().positive().max(1_000_000), trend: z.enum(["up", "down"]) });
export type ExternalCoin = { symbol: string; name: string; price: number; change: number | null; bid: number; ask: number; updatedAt: number; trend?: "up" | "down" };
const numeric = z.union([z.number(), z.string().min(1)]).transform(Number).pipe(z.number().finite());
const coinSchema = z.object({ symbol: z.string().min(1).max(30), name: z.string().optional(), price: numeric.pipe(z.number().positive()), change24h: numeric.optional(), change: numeric.optional(), bid: numeric.optional(), ask: numeric.optional(), updatedAt: z.union([z.number(), z.string()]).optional(), trend: z.enum(["up", "down"]).optional() });
export function parseCoins(payload: unknown): ExternalCoin[] {
  const body = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
  const raw = Array.isArray(payload) ? payload : body?.["coins"] ?? body?.["data"] ?? payload;
  return (Array.isArray(raw) ? raw : [raw]).map(value => {
    const c = coinSchema.parse(value);
    const symbol = c.symbol.toUpperCase().replace(/\/USDT$|USDT$/, "");
    if (!/^[A-Z0-9]{1,20}$/.test(symbol)) throw new Error("Invalid coin symbol");
    const t = c.updatedAt === undefined ? Date.now() : typeof c.updatedAt === "number" ? (c.updatedAt < 1e12 ? c.updatedAt * 1000 : c.updatedAt) : Date.parse(c.updatedAt);
    if (!Number.isFinite(t) || t > Date.now() + 60_000) throw new Error("Invalid quote timestamp");
    return { symbol, name: c.name || (symbol === "DAFT" ? "DaftCoin" : symbol), price: c.price, change: c.change24h ?? c.change ?? null, bid: c.bid && c.bid > 0 ? c.bid : NaN, ask: c.ask && c.ask > 0 ? c.ask : NaN, updatedAt: t, ...(c.trend ? { trend: c.trend } : {}) };
  });
}
export function coinAsset(coin: ExternalCoin): SampleAsset {
  const known = sampleAssets.find(a => a.category === "Crypto" && a.symbol === coin.symbol);
  return known ?? { pair: `${coin.symbol}/USDT`, symbol: coin.symbol, quote: "USDT", name: coin.name, category: "Crypto", price: "", change: "", icon: coin.symbol[0] || "?", color: "ripple" };
}

// Asset identity is independent of quote availability; never use fixture prices.
export function cryptoAssetList(coins: Record<string, ExternalCoin>): SampleAsset[] {
  const assets = new Map<string, SampleAsset>();
  assets.set("DAFT", { pair: "DAFT/USDT", symbol: "DAFT", quote: "USDT", name: "DaftCoin", category: "Crypto", price: "", change: "", icon: "D", color: "ripple" });
  for (const asset of sampleAssets.filter(a => a.category === "Crypto")) {
    assets.set(asset.symbol, { ...asset, price: "", change: "" });
  }
  for (const coin of Object.values(coins)) {
    assets.set(coin.symbol, { ...coinAsset(coin), price: "", change: "" });
  }
  return [...assets.values()];
}
