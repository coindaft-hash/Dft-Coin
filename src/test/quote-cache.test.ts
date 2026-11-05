import { beforeEach, describe, expect, it } from "vitest";
import { readQuoteCache, saveQuoteCache } from "@/lib/quote-cache";

describe("real quote display cache", () => {
  beforeEach(() => localStorage.clear());
  it("preserves prices and timestamps after reload, with missing bid/ask unavailable", () => {
    const fetchedAt = Date.now() - 1000;
    saveQuoteCache("quotes", { fetchedAt, quotes: { BTC: { last: 90000, bid: NaN, ask: NaN, open24h: 89000, ts: fetchedAt } } });
    const restored = readQuoteCache("quotes");
    expect(restored?.fetchedAt).toBe(fetchedAt);
    expect(restored?.quotes['BTC']?.last).toBe(90000);
    expect(restored?.quotes['BTC']?.bid).toBeNaN();
  });
  it("rejects corrupt and future snapshots and invalid prices", () => {
    localStorage.setItem("quotes", "not json");
    expect(readQuoteCache("quotes")).toBeNull();
    saveQuoteCache("quotes", { fetchedAt: Date.now() + 10000, quotes: {} });
    expect(readQuoteCache("quotes")).toBeNull();
    saveQuoteCache("quotes", { fetchedAt: Date.now(), quotes: { BTC: { last: -1, bid: 1, ask: 1, open24h: 1, ts: Date.now() } } });
    expect(readQuoteCache("quotes")).toBeNull();
  });
});