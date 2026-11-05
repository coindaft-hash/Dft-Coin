import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { simulatedDaftQuote } from "@/lib/daft-simulation";

export type LiveCandle = { t: number; open: number; high: number; low: number; close: number };
export type CandleResult = { ok: true; candles: LiveCandle[]; fetchedAt: number } | { ok: false; message: string };

const INTERVALS = new Set(["1m", "5m", "15m", "1h", "4h", "1d"]);
const INTERVAL_MS: Record<string, number> = { "1m": 60_000, "5m": 300_000, "15m": 900_000, "1h": 3_600_000, "4h": 14_400_000, "1d": 86_400_000 };
// Fallback interval codes for the alternate public spot feeds.
const BYBIT_INTERVAL: Record<string, string> = { "1m": "1", "5m": "5", "15m": "15", "1h": "60", "4h": "240", "1d": "D" };
const OKX_INTERVAL: Record<string, string> = { "1m": "1m", "5m": "5m", "15m": "15m", "1h": "1H", "4h": "4H", "1d": "1D" };
const cache = new Map<string, { at: number; candles: LiveCandle[] }>();
const CACHE_MS = 15_000;

// DaftCoin is simulated, not on Binance: build candles from the same time-based simulation as the live quote.
async function daftCandles(interval: string): Promise<CandleResult> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return { ok: false, message: "Quote service unavailable" };
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const { data: base, error } = await client.from("daft_quote").select("symbol,price,baseline_price,baseline_at,trend,trend_until,updated_at,version").eq("symbol", "DAFT").single();
  if (error || !base) return { ok: false, message: "DaftCoin quote unavailable" };
  const bucket = INTERVAL_MS[interval] ?? 60_000;
  const now = Math.floor(Date.now() / 2000) * 2000;
  const end = Math.floor(now / bucket) * bucket;
  const priceAt = (t: number) => simulatedDaftQuote(base, t).price;
  const candles: LiveCandle[] = [];
  for (let i = 39; i >= 0; i--) {
    const t = end - i * bucket;
    const open = priceAt(t);
    const mid1 = priceAt(t + bucket / 3);
    const mid2 = priceAt(t + (2 * bucket) / 3);
    const close = priceAt(t + bucket);
    candles.push({ t, open, high: Math.max(open, mid1, mid2, close), low: Math.min(open, mid1, mid2, close), close });
  }
  return { ok: true, candles, fetchedAt: Date.now() };
}

// Real Binance spot klines (public, no key). Shared cache keeps request volume low.
export const getCryptoCandles = createServerFn({ method: "GET" })
  .inputValidator((input: { symbol: string; interval: string }) => {
    const interval = input.interval.toLowerCase();
    if (!/^[A-Z0-9]{1,10}$/.test(input.symbol) || !INTERVALS.has(interval)) throw new Error("Invalid input");
    return { symbol: input.symbol, interval };
  })
  .handler(async ({ data }): Promise<CandleResult> => {
    const key = `${data.symbol}:${data.interval}`;
    const hit = cache.get(key);
    const ttl = data.symbol === "DAFT" ? 2_000 : CACHE_MS;
    if (hit && Date.now() - hit.at < ttl) return { ok: true, candles: hit.candles, fetchedAt: hit.at };
    if (data.symbol === "DAFT") {
      const result = await daftCandles(data.interval);
      if (result.ok) cache.set(key, { at: Date.now(), candles: result.candles });
      return result.ok ? result : hit ? { ok: true, candles: hit.candles, fetchedAt: hit.at } : result;
    }
    const stale = (): CandleResult => hit ? { ok: true, candles: hit.candles, fetchedAt: hit.at } : { ok: false, message: "Chart data unavailable" };
    try {
      // Binance mirrors first; when the exchange blocks the server's IP, other public spot feeds keep charts working.
      const sources: (() => Promise<LiveCandle[] | null>)[] = [
        ...["https://api.binance.com/api/v3", "https://data-api.binance.vision/api/v3"].map(base => async () => {
          const res = await fetch(`${base}/klines?symbol=${data.symbol}USDT&interval=${data.interval}&limit=40`, { signal: AbortSignal.timeout(6_000) });
          if (!res.ok) return null;
          const rows = await res.json() as [number, string, string, string, string][];
          if (!Array.isArray(rows)) return null;
          return rows.map(r => ({ t: Number(r[0]), open: Number(r[1]), high: Number(r[2]), low: Number(r[3]), close: Number(r[4]) }));
        }),
        async () => {
          const res = await fetch(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${data.symbol}USDT&interval=${BYBIT_INTERVAL[data.interval]}&limit=40`, { signal: AbortSignal.timeout(6_000) });
          if (!res.ok) return null;
          const list = (await res.json() as { result?: { list?: string[][] } })?.result?.list;
          if (!Array.isArray(list)) return null;
          return list.map(r => ({ t: Number(r[0]), open: Number(r[1]), high: Number(r[2]), low: Number(r[3]), close: Number(r[4]) })).reverse();
        },
        async () => {
          const res = await fetch(`https://www.okx.com/api/v5/market/candles?instId=${data.symbol}-USDT&bar=${OKX_INTERVAL[data.interval]}&limit=40`, { signal: AbortSignal.timeout(6_000) });
          if (!res.ok) return null;
          const rows = (await res.json() as { data?: string[][] })?.data;
          if (!Array.isArray(rows)) return null;
          return rows.map(r => ({ t: Number(r[0]), open: Number(r[1]), high: Number(r[2]), low: Number(r[3]), close: Number(r[4]) })).reverse();
        },
      ];
      for (const fetchCandles of sources) {
        const candles = await fetchCandles();
        if (candles && candles.length > 0 && candles.every(c => c.close > 0 && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low))) {
          cache.set(key, { at: Date.now(), candles });
          return { ok: true, candles, fetchedAt: Date.now() };
        }
      }
      return stale();
    } catch (e) {
      return hit ? { ok: true, candles: hit.candles, fetchedAt: hit.at } : { ok: false, message: e instanceof Error ? e.message : "Network error" };
    }
  });
