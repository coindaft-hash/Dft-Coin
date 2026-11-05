import type { LiveQuote } from "./crypto-prices.functions";

export type QuoteSnapshot = { quotes: Record<string, LiveQuote>; fetchedAt: number; source?: string };

/** Storage is only a display cache, never proof of a fresh tradable quote. */
export function readQuoteCache(key: string): QuoteSnapshot | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Number.isFinite(data.fetchedAt) || data.fetchedAt > Date.now() || !data.quotes || typeof data.quotes !== "object") return null;
    const quotes: Record<string, LiveQuote> = {};
    for (const [symbol, value] of Object.entries(data.quotes)) {
      const q = value as LiveQuote;
      if (!q || !Number.isFinite(q.last) || q.last <= 0 || !Number.isFinite(q.ts)) continue;
      quotes[symbol] = { ...q, bid: typeof q.bid === "number" ? q.bid : NaN, ask: typeof q.ask === "number" ? q.ask : NaN, open24h: typeof q.open24h === "number" ? q.open24h : NaN };
    }
    return Object.keys(quotes).length ? { quotes, fetchedAt: data.fetchedAt, source: typeof data.source === "string" ? data.source : undefined } : null;
  } catch { return null; }
}

export function saveQuoteCache(key: string, value: QuoteSnapshot) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage is optional. */ }
}