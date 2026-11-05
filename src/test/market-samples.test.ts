import { describe, expect, it } from "vitest";
import { filterSampleAssets, sampleAssets } from "@/lib/market-samples";

const cryptoPairs = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "XRP/USDT", "ADA/USDT", "DOGE/USDT", "TRX/USDT", "TON/USDT", "LINK/USDT", "AVAX/USDT", "DOT/USDT", "LTC/USDT", "BCH/USDT", "NEAR/USDT", "UNI/USDT", "APT/USDT", "SUI/USDT", "OP/USDT", "ARB/USDT", "ETC/USDT", "FIL/USDT", "ATOM/USDT", "XLM/USDT", "XMR/USDT", "ICP/USDT", "AAVE/USDT", "SHIB/USDT", "PEPE/USDT", "USDC/USDT"];
const forexPairs = ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD", "EUR/GBP", "EUR/JPY", "GBP/JPY", "EUR/CHF", "AUD/JPY", "GBP/CHF", "EUR/AUD", "USD/SGD"];

describe("Sample markets", () => {
  it("lists the requested crypto and forex pairs", () => {
    const pairs = sampleAssets.map(asset => asset.pair);
    expect(cryptoPairs.every(pair => pairs.includes(pair))).toBe(true);
    expect(forexPairs.every(pair => pairs.includes(pair))).toBe(true);
    expect(pairs).toHaveLength(cryptoPairs.length + forexPairs.length);
    expect(new Set(pairs).size).toBe(pairs.length);
  });
  it("keeps every asset categorised and sample-labelled", () => {
    expect(sampleAssets.filter(asset => asset.category === "Crypto")).toHaveLength(30);
    expect(sampleAssets.filter(asset => asset.category === "Forex")).toHaveLength(15);
    expect(sampleAssets.every(asset => /^[+\u2212]\d/.test(asset.change))).toBe(true);
    expect(sampleAssets.every(asset => asset.icon && asset.color && asset.name)).toBe(true);
  });
  it("filters by category and symbol or name", () => {
    expect(filterSampleAssets("Crypto", "bitcoin", false, []).map(asset => asset.pair)).toEqual(["BTC/USDT", "BCH/USDT"]);
    expect(filterSampleAssets("Forex", " GBP / USD ", false, []).map(asset => asset.pair)).toEqual(["GBP/USD"]);
    expect(filterSampleAssets("Forex", "BTC", false, [])).toEqual([]);
  });
  it("filters the watchlist within each category", () => {
    expect(filterSampleAssets("Crypto", "", true, ["SOL/USDT", "EUR/USD"]).map(asset => asset.pair)).toEqual(["SOL/USDT"]);
    expect(filterSampleAssets("Crypto", "", true, [])).toEqual([]);
  });
});
