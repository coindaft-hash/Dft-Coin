import { createServerFn } from "@tanstack/react-start";

export type LiveQuote = { last: number; bid: number; ask: number; open24h: number; ts: number };
export type CryptoPriceResult =
  | { ok: true; source: string; fetchedAt: number; cached: boolean; quotes: Record<string, LiveQuote> }
  | { ok: false; error: "rate_limited" | "upstream_error" | "network_error"; message: string; detail: string; retryAfterMs: number; fetchedAt: number };

type Ticker24h = { symbol: string; lastPrice: string; openPrice: string; closeTime: number };
type BookTicker = { symbol: string; bidPrice: string; askPrice: string };
type Snapshot = { fetchedAt: number; source: string; tickers: Map<string, LiveQuote> };
type Failure = Extract<CryptoPriceResult, { ok: false }>;

// Two batched public requests (24h ticker + best bid/ask), shared by every visitor.
const BASES = ["https://data-api.binance.vision/api/v3", "https://api.binance.com/api/v3", "https://api1.binance.com/api/v3", "https://api2.binance.com/api/v3"];
let baseIdx = 0;

// Fallback public spot feeds used when every Binance mirror is unreachable from the
// server (some datacenter IPs are blocked by the exchange). Each is one batched request.
type FallbackEntry = readonly [string, LiveQuote];
const FALLBACKS: { name: string; url: string; parse: (body: unknown) => FallbackEntry[] }[] = [
  {
    name: "Bybit",
    url: "https://api.bybit.com/v5/market/tickers?category=spot",
    parse: body => {
      const list = (body as { result?: { list?: unknown[] } } | null)?.result?.list;
      if (!Array.isArray(list)) return [];
      return list.flatMap(item => {
        const t = item as { symbol?: string; lastPrice?: string; bid1Price?: string; ask1Price?: string; prevPrice24h?: string };
        if (!t.symbol?.endsWith("USDT")) return [];
        const last = Number(t.lastPrice), bid = Number(t.bid1Price), ask = Number(t.ask1Price), open = Number(t.prevPrice24h);
        if (!Number.isFinite(last) || last <= 0) return [];
        return [[t.symbol.slice(0, -4), { last, bid: bid > 0 ? bid : last, ask: ask > 0 ? ask : last, open24h: open > 0 ? open : last, ts: Date.now() }] as const];
      });
    },
  },
  {
    name: "OKX",
    url: "https://www.okx.com/api/v5/market/tickers?instType=SPOT",
    parse: body => {
      const list = (body as { data?: unknown[] } | null)?.data;
      if (!Array.isArray(list)) return [];
      return list.flatMap(item => {
        const t = item as { instId?: string; last?: string; bidPx?: string; askPx?: string; open24h?: string; ts?: string };
        if (!t.instId?.endsWith("-USDT")) return [];
        const last = Number(t.last), bid = Number(t.bidPx), ask = Number(t.askPx), open = Number(t.open24h);
        if (!Number.isFinite(last) || last <= 0) return [];
        return [[t.instId.slice(0, -5), { last, bid: bid > 0 ? bid : last, ask: ask > 0 ? ask : last, open24h: open > 0 ? open : last, ts: Number(t.ts) || Date.now() }] as const];
      });
    },
  },
];
const CACHE_MS = 12_000;
let cache: Snapshot | null = null;
let inflight: Promise<Snapshot | Failure> | null = null;
let blockedUntil = 0;
let backoffMs = 0;
let lastFailure: Failure | null = null;
let lastSymbolsKey = "";

function fail(error: Failure["error"], message: string, detail: string, retryAfterMs: number): Failure {
  return { ok: false, error, message, detail, retryAfterMs, fetchedAt: Date.now() };
}

async function fetchJson(url: string): Promise<{ res: Response; body: unknown; text: string }> {
  const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(6_000) });
  const text = await res.text();
  let body: unknown = null;
  try { body = JSON.parse(text); } catch { /* non-JSON body */ }
  return { res, body, text };
}

function throttled(res: Response, body: unknown, text: string): Failure | null {
  // Binance signals throttling via HTTP 429/418 or code -1003.
  const code = (body as { code?: number } | null)?.code;
  if (res.status !== 429 && res.status !== 418 && code !== -1003) return null;
  backoffMs = Math.min(backoffMs ? backoffMs * 2 : 15_000, 120_000);
  const ra = Number(res.headers.get("retry-after"));
  const wait = Number.isFinite(ra) && ra > 0 ? Math.max(ra * 1000, backoffMs) : backoffMs;
  blockedUntil = Date.now() + wait;
  const msg = (body as { msg?: string } | null)?.msg ?? text.slice(0, 160);
  return fail("rate_limited", "Exchange rate limit reached. Retrying shortly.", `HTTP ${res.status} code=${code ?? "-"} msg=${msg}`, wait);
}

async function fetchSnapshot(symbols: string[]): Promise<Snapshot | Failure> {
  try {
    // Fetch exchange-wide batches so delisted symbols cannot invalidate the request.
    // Request only the needed symbols (small payload); rotate mirrors on network failure.
    const list = encodeURIComponent(JSON.stringify(symbols.map(s => `${s}USDT`)));
    let t24!: Awaited<ReturnType<typeof fetchJson>>, book!: Awaited<ReturnType<typeof fetchJson>>;
    let lastErr: unknown = null;
    for (let i = 0; i < BASES.length; i++) {
      const base = BASES[(baseIdx + i) % BASES.length];
      try {
        [t24, book] = await Promise.all([
          fetchJson(`${base}/ticker/24hr?type=MINI&symbols=${list}`).then(async r => r.res.status === 400 ? fetchJson(`${base}/ticker/24hr?type=MINI`) : r),
          fetchJson(`${base}/ticker/bookTicker?symbols=${list}`).then(async r => r.res.status === 400 ? fetchJson(`${base}/ticker/bookTicker`) : r),
        ]);
        if (t24.res.status >= 500 || t24.res.status === 403 || t24.res.status === 451) { lastErr = new Error(`HTTP ${t24.res.status}`); continue; }
        baseIdx = (baseIdx + i) % BASES.length; lastErr = null; break;
      } catch (e) { lastErr = e; }
    }
    if (lastErr) {
      // Every Binance mirror failed (often HTTP 403 from datacenter IPs): fall back to
      // other public spot feeds so prices keep working. Never invented — real quotes only.
      for (const fb of FALLBACKS) {
        try {
          const { res, body } = await fetchJson(fb.url);
          if (!res.ok) continue;
          const wanted = new Set(symbols);
          const tickers = new Map<string, LiveQuote>();
          for (const [sym, quote] of fb.parse(body)) if (wanted.has(sym)) tickers.set(sym, quote);
          if (tickers.size > 0) return { fetchedAt: Date.now(), source: fb.name, tickers };
        } catch { /* try the next fallback */ }
      }
      throw lastErr;
    }
    for (const r of [t24, book]) {
      const limited = throttled(r.res, r.body, r.text);
      if (limited) return limited;
    }
    if (!t24.res.ok || !Array.isArray(t24.body)) {
      const code = (t24.body as { code?: number } | null)?.code;
      const msg = (t24.body as { msg?: string } | null)?.msg ?? t24.text.slice(0, 160);
      return fail("upstream_error", "Exchange returned an error.", `HTTP ${t24.res.status} code=${code ?? "-"} msg=${msg}`, 15_000);
    }
    backoffMs = 0;
    const books = new Map<string, { bid: number; ask: number }>();
    if (book.res.ok && Array.isArray(book.body)) {
      for (const b of book.body as BookTicker[]) {
        books.set(b.symbol, { bid: Number(b.bidPrice), ask: Number(b.askPrice) });
      }
    }
    const tickers = new Map<string, LiveQuote>();
    for (const t of t24.body as Ticker24h[]) {
      if (!t.symbol?.endsWith("USDT")) continue;
      const last = Number(t.lastPrice);
      const open24h = Number(t.openPrice);
       if (!Number.isFinite(last) || last <= 0) continue;
      const bb = books.get(t.symbol);
       if (!bb || !(bb.bid > 0) || !(bb.ask > 0)) continue;
      tickers.set(t.symbol.slice(0, -4), {
        last,
        bid: bb && Number.isFinite(bb.bid) && bb.bid > 0 ? bb.bid : last,
        ask: bb && Number.isFinite(bb.ask) && bb.ask > 0 ? bb.ask : last,
        open24h: Number.isFinite(open24h) ? open24h : last,
        ts: Number(t.closeTime) || Date.now(),
      });
    }
    return { fetchedAt: Date.now(), source: "Binance", tickers };
  } catch (e) {
    return fail("network_error", "Could not reach the exchange.", e instanceof Error ? e.message : String(e), 15_000);
  }
}

export const getCryptoPrices = createServerFn({ method: "GET" })
  .inputValidator((input: { symbols: string[] }) => ({ symbols: input.symbols.filter(s => /^[A-Z0-9]{1,10}$/.test(s)).slice(0, 60) }))
  .handler(async ({ data }): Promise<CryptoPriceResult> => {
    const pick = (snap: Snapshot, cached: boolean): CryptoPriceResult => {
      const quotes: Record<string, LiveQuote> = {};
      for (const s of data.symbols) { const q = snap.tickers.get(s); if (q) quotes[s] = q; }
      return { ok: true, source: snap.source, fetchedAt: snap.fetchedAt, cached, quotes };
    };
    const now = Date.now();
    const symbolsKey = data.symbols.slice().sort().join(",");
    if (cache && symbolsKey === lastSymbolsKey && now - cache.fetchedAt < CACHE_MS) return pick(cache, true);
    if (now < blockedUntil && lastFailure) return { ...lastFailure, retryAfterMs: blockedUntil - now };
    if (!inflight) {
      lastSymbolsKey = symbolsKey;
      inflight = fetchSnapshot(data.symbols).finally(() => { inflight = null; });
    }
    const result = await inflight;
    if ("tickers" in result) { cache = result; lastFailure = null; return pick(result, false); }
    lastFailure = result;
    // Brief upstream blips: keep serving the last real snapshot (up to 2 min) instead of disconnecting.
    if (cache && Date.now() - cache.fetchedAt < 120_000) return pick(cache, true);
    return result;
  });
