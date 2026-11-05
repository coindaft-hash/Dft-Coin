import { queryOptions } from "@tanstack/react-query";
import { getDaftQuote } from "@/lib/daftcoin.functions";

export const daftQuoteOptions = queryOptions({
  queryKey: ["daftcoin-quote"],
  queryFn: () => getDaftQuote(),
  staleTime: 15_000,
});