import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDaftQuote } from "@/lib/daftcoin.functions";
import type { ExternalCoin } from "@/lib/external-market";
import type { FeedStatus } from "@/hooks/use-live-crypto";

export function useCloudDaft() {
  const fetchQuote = useServerFn(getDaftQuote);
  const result = useQuery({ queryKey: ["cloud-daft-simulation"], queryFn: () => fetchQuote(), staleTime: 1000, refetchInterval: 2000, refetchOnMount: false, retry: false });
  const q = result.data;
  const coin: ExternalCoin | undefined = q ? {
    symbol: "DAFT", name: "DaftCoin", price: Number(q.price),
    change: q.baseline_price > 0 ? (Number(q.price) / Number(q.baseline_price) - 1) * 100 : null,
    bid: Number(q.price), ask: Number(q.price), updatedAt: Date.parse(q.updated_at),
    ...(q.trend === "up" || q.trend === "down" ? { trend: q.trend } : {}),
  } : undefined;
  const status: FeedStatus = coin ? result.isError || Date.now() - coin.updatedAt > 10_000 ? "delayed" : "live" : result.isPending ? "loading" : "error";
  return { coin, quote: q, status, message: result.error ? "DAFT price unavailable" : "" };
}