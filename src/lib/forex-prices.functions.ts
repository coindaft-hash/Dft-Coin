import { createServerFn } from "@tanstack/react-start";
import type { LiveQuote } from "@/lib/crypto-prices.functions";

// Forex quote: Twelve Data gives no bid/ask on /quote, so those stay NaN (shown as "—").
export type ForexPriceResult =
  | { ok: true; source: string; fetchedAt: number; cached: boolean; quotes: Record<string, LiveQuote & { closed: boolean }> }
  | { ok: false; error: "rate_limited" | "upstream_error" | "network_error" | "not_configured"; message: string; detail: string; retryAfterMs: number; fetchedAt: number };

type Failure = Extract<ForexPriceResult, { ok: false }>;
type TDQuote = { symbol?: string; close?: string; previous_close?: string; timestamp?: number; is_market_open?: boolean; code?: number; status?: string; message?: string };

// Free plan: 8 credits/minute, 1 credit per symbol. Refresh the stalest 7 pairs at most once per minute,
// shared by every visitor, so all 15 pairs refresh roughly every 2–3 minutes.
const BATCH = 7;
const MIN_GAP_MS = 62_000;
const cache = new Map<string, LiveQuote & { closed: boolean; fetchedAt: number }>();
let lastCall = 0;
let inflight: Promise<Failure | null> | null = null;
let blockedUntil = 0;
let backoffMs = 0;
let lastFailure: Failure | null = null;

const fail = (error: Failure["error"], message: string, detail: string, retryAfterMs: number): Failure =>
  ({ ok: false, error, message, detail, retryAfterMs, fetchedAt: Date.now() });

async function refresh(pairs: string[], key: string): Promise<Failure | null> {
  const stalest = pairs.slice().sort((a, b) => (cache.get(a)?.fetchedAt ?? 0) - (cache.get(b)?.fetchedAt ?? 0)).slice(0, BATCH);
  lastCall = Date.now();
  try {
    const res = await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(stalest.join(","))}&apikey=${encodeURIComponent(key)}`);
    const text = await res.text();
    let body: unknown = null;
    try { body = JSON.parse(text); } catch { /* non-JSON */ }
    const top = body as TDQuote | null;
    if (res.status === 429 || top?.code === 429) {
      backoffMs = Math.min(backoffMs ? backoffMs * 2 : 65_000, 300_000);
      blockedUntil = Date.now() + backoffMs;
      return fail("rate_limited", "Forex provider rate limit reached. Retrying shortly.", `HTTP ${res.status} ${top?.message ?? text.slice(0, 160)}`, backoffMs);
    }
    if (!res.ok || !body || top?.status === "error") {
      return fail("upstream_error", "Forex provider returned an error.", `HTTP ${res.status} code=${top?.code ?? "-"} ${top?.message ?? text.slice(0, 160)}`, MIN_GAP_MS);
    }
    backoffMs = 0;
    // Single-symbol responses are the quote object itself; multi-symbol responses are keyed by symbol.
    const entries: [string, TDQuote][] = stalest.length === 1 ? [[stalest[0]!, top as TDQuote]] : Object.entries(body as Record<string, TDQuote>);
    const now = Date.now();
    for (const [pair, q] of entries) {
      const last = Number(q.close), prev = Number(q.previous_close);
      if (q.status === "error" || !Number.isFinite(last) || last <= 0) continue;
      cache.set(pair, { last, bid: NaN, ask: NaN, open24h: Number.isFinite(prev) && prev > 0 ? prev : last, ts: q.timestamp ? q.timestamp * 1000 : now, closed: q.is_market_open === false, fetchedAt: now });
    }
    return null;
  } catch (e) {
    return fail("network_error", "Could not reach the forex provider.", e instanceof Error ? e.message : String(e), MIN_GAP_MS);
  }
}

let backup: Record<string, number> | null = null;
let backupAt = 0;
let backupFetched = 0;
async function backupRates() {
  if (backup && Date.now() - backupFetched < 30 * 60_000) return backup;
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(6_000) });
    const body = await res.json() as { result?: string; rates?: Record<string, number>; time_last_update_unix?: number };
    if (res.ok && body.result === "success" && body.rates) {
      backup = body.rates; backupFetched = Date.now(); backupAt = (body.time_last_update_unix ?? 0) * 1000 || Date.now();
    }
  } catch { /* keep previous */ }
  return backup;
}

export const getForexPrices = createServerFn({ method: "GET" })
  .inputValidator((input: { pairs: string[] }) => ({ pairs: input.pairs.filter(p => /^[A-Z]{3}\/[A-Z]{3}$/.test(p)).slice(0, 30) }))
  .handler(async ({ data }): Promise<ForexPriceResult> => {
    const key = process.env["TWELVE_DATA_API_KEY"];
    const now = Date.now();
    // Twelve Data's free plan is heavily rate limited, so it only refines pairs whose
    // backup reference rate is older than 30 minutes — and only when a key exists.
    const needsRefine = key ? data.pairs.filter(p => now - (cache.get(p)?.fetchedAt ?? 0) > 30 * 60_000) : [];
    if (key && needsRefine.length && now >= blockedUntil && now - lastCall >= MIN_GAP_MS && !inflight) {
      inflight = refresh(needsRefine, key).finally(() => { inflight = null; });
    }
    if (inflight) lastFailure = await inflight;
    const quotes: Record<string, LiveQuote & { closed: boolean }> = {};
    let oldest = Infinity;
    let usedTwelveData = false;
    for (const p of data.pairs) {
      const q = cache.get(p);
      if (q) { const { fetchedAt, ...rest } = q; quotes[p] = rest; oldest = Math.min(oldest, fetchedAt); usedTwelveData = true; }
    }
    // Primary source: keyless reference rates (open.er-api.com) fill every pair Twelve Data
    // did not supply recently, so rate limits can never blank the list. Real rates only.
    const missing = data.pairs.filter(p => !quotes[p]);
    if (missing.length) {
      const rates = await backupRates();
      for (const p of missing) {
        const [b, q] = p.split("/") as [string, string];
        const rb = b === "USD" ? 1 : rates?.[b], rq = q === "USD" ? 1 : rates?.[q];
        if (!rb || !rq) continue;
        const last = rq / rb;
        quotes[p] = { last, bid: NaN, ask: NaN, open24h: last, ts: backupAt, closed: false };
        oldest = Math.min(oldest, backupAt);
      }
    }
    if (!Object.keys(quotes).length && lastFailure) return { ...lastFailure, retryAfterMs: Math.max(blockedUntil - now, lastFailure.retryAfterMs) };
    if (!Object.keys(quotes).length) return fail("network_error", "Forex rates are temporarily unavailable.", "No provider returned rates", 60_000);
    return { ok: true, source: usedTwelveData ? "Twelve Data" : "ER-API", fetchedAt: Number.isFinite(oldest) ? oldest : now, cached: true, quotes };
  });
