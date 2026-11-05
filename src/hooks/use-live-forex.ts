import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getForexPrices } from "@/lib/forex-prices.functions";
import type { LiveQuote } from "@/lib/crypto-prices.functions";
import type { FeedStatus } from "@/hooks/use-live-crypto";
import { sampleAssets } from "@/lib/market-samples";
import { readQuoteCache, saveQuoteCache } from "@/lib/quote-cache";

const PAIRS = sampleAssets.filter(a => a.category === "Forex").map(a => a.pair);
const QUERY_KEY = ["twelve-data-forex"];
const CACHE_KEY = "vertex-forex-quotes-v1";
type ForexQuote = LiveQuote & { closed: boolean };
type Snapshot = { quotes: Record<string, ForexQuote>; fetchedAt: number; restored: boolean; source?: string };
type FeedError = Error & { retryAfterMs?: number; rateLimited?: boolean };

// A single cached query survives navigation; every screen observes the same feed.
export function useLiveForex(_symbols: string[]) {
  const client = useQueryClient();
  const fetchPrices = useServerFn(getForexPrices);
  useEffect(() => {
    if (client.getQueryData(QUERY_KEY)) return;
    const stored = readQuoteCache(CACHE_KEY);
    if (stored) client.setQueryData(QUERY_KEY, { ...stored, restored: true }, { updatedAt: stored.fetchedAt });
  }, [client]);
  const result = useQuery<Snapshot, FeedError>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const response = await fetchPrices({ data: { pairs: PAIRS } });
      if (!response.ok) {
        if (import.meta.env.DEV) console.warn("[Forex feed]", response.error, response.detail);
        throw Object.assign(new Error(response.message), { retryAfterMs: response.retryAfterMs, rateLimited: response.error === "rate_limited" });
      }
      saveQuoteCache(CACHE_KEY, response);
      return { quotes: response.quotes, fetchedAt: response.fetchedAt, restored: false, source: response.source };
    },
    staleTime: 30_000,
    refetchOnMount: false,
    refetchInterval: query => Math.max(30_000, query.state.error?.retryAfterMs ?? 0),
    retry: false,
  });
  const stale = !!result.data && Date.now() - result.data.fetchedAt > 360_000;
  const status: FeedStatus = result.data ? result.data.restored || result.isError || stale ? "delayed" : "live" : result.isPending ? "loading" : result.error?.rateLimited ? "rate_limited" : "error";
  return { quotes: result.data?.quotes ?? {}, updatedAt: result.data?.fetchedAt ?? null, status, message: result.error?.message ?? "", source: result.data?.source ?? "ER-API" };
}
