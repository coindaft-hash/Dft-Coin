import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCloudDaft } from "@/hooks/use-cloud-daft";
import { sampleAssets } from "@/lib/market-samples";
import { getCryptoPrices, type LiveQuote } from "@/lib/crypto-prices.functions";
import { readQuoteCache, saveQuoteCache } from "@/lib/quote-cache";
export type FeedStatus = "loading" | "live" | "delayed" | "rate_limited" | "error";
const symbols = sampleAssets.filter(a => a.category === "Crypto").map(a => a.symbol);

export function useLiveCrypto(_symbols: string[]) {
  const client = useQueryClient();
  const fetchPrices = useServerFn(getCryptoPrices);
  const simulation = useCloudDaft();
  useEffect(() => {
    if (client.getQueryData(["binance-standard-crypto"])) return;
    const stored = readQuoteCache("vertex-crypto-quotes-v1");
    if (stored) client.setQueryData(["binance-standard-crypto"], { ...stored, ok: true, source: stored.source ?? "Binance", cached: true, restored: true }, { updatedAt: stored.fetchedAt });
  }, [client]);
  const result = useQuery({
    queryKey: ["binance-standard-crypto"],
    queryFn: async () => {
      const response = await fetchPrices({ data: { symbols } });
      if (!response.ok) {
        if (import.meta.env.DEV) console.warn("[Binance feed]", response.detail);
        throw Object.assign(new Error(response.message), { retryAfterMs: response.retryAfterMs, rateLimited: response.error === "rate_limited" });
      }
      saveQuoteCache("vertex-crypto-quotes-v1", response);
      return { ...response, restored: false };
    },
    staleTime: 12_000,
    refetchOnMount: false,
    refetchInterval: query => Math.max(15_000, (query.state.error as { retryAfterMs?: number } | null)?.retryAfterMs ?? 0),
    retry: 2,
    retryDelay: 1500,
  });
  const quotes: Record<string, LiveQuote> = { ...result.data?.quotes };
  const status: FeedStatus = result.data ? result.data.restored || result.isError || Date.now() - result.data.fetchedAt > 45_000 ? "delayed" : "live" : result.isPending ? "loading" : (result.error as { rateLimited?: boolean } | null)?.rateLimited ? "rate_limited" : "error";
  const daft = simulation.coin;
  if (daft) quotes["DAFT"] = { last: daft.price, bid: daft.bid, ask: daft.ask, open24h: daft.change !== null && daft.change > -100 ? daft.price / (1 + daft.change / 100) : NaN, ts: daft.updatedAt };
  const daftStatus = simulation.status;
  return {
    quotes, status, updatedAt: result.data?.fetchedAt ?? null,
    source: (result.data as { source?: string } | null)?.source ?? "Binance",
    message: result.error?.message ?? "",
    coins: daft ? { DAFT: daft } : {},
    daftStatus, daftMessage: simulation.message,
    statusFor: (symbol: string): FeedStatus => symbol === "DAFT" ? daftStatus : status,
  };
}