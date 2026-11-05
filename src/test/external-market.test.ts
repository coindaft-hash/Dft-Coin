import { describe, it, expect } from "vitest";
import { parseCoins, adminCoinSchema, coinAsset, cryptoAssetList } from "@/lib/external-market";
describe("external market contract", () => {
  it("retains DAFT and all 30 original assets without quotes or sample prices", () => {
    const assets = cryptoAssetList({});
    expect(assets).toHaveLength(31);
    expect(assets[0]?.symbol).toBe("DAFT");
    expect(assets.some(a => a.symbol === "BTC")).toBe(true);
    expect(assets.every(a => a.price === "" && a.change === "")).toBe(true);
  });
  it("merges partial server lists without duplicates or hiding original assets", () => {
    const coins = parseCoins([{ symbol: "BTC", price: 60000 }, { symbol: "NEW", price: 2 }]);
    const assets = cryptoAssetList(Object.fromEntries(coins.map(c => [c.symbol, c])));
    expect(assets).toHaveLength(32);
    expect(assets.filter(a => a.symbol === "BTC")).toHaveLength(1);
    expect(assets.some(a => a.symbol === "ETH")).toBe(true);
  });
  it("normalizes REST lists and single socket updates", () => {
    const [coin] = parseCoins({ coins: [{ symbol: "DAFT", price: "1.2", change24h: "4", trend: "up" }] });
    expect(coin?.price).toBe(1.2);
    expect(coin?.change).toBe(4);
    expect(parseCoins({ symbol: "BTCUSDT", price: 60000 })[0]?.symbol).toBe("BTC");
    if (coin) expect(coinAsset(coin).pair).toBe("DAFT/USDT");
  });
  it("does not invent bid, ask or change", () => {
    const coin = parseCoins([{ symbol: "BTC", price: 60000 }])[0];
    expect(coin?.change).toBeNull();
    expect(coin?.bid).toBeNaN();
  });
  it("rejects malformed payloads and invalid admin mutations", () => {
    for (const price of [0, -1, "", "bad", Infinity]) expect(() => parseCoins({ symbol: "DAFT", price })).toThrow();
    expect(adminCoinSchema.safeParse({ symbol: "BTC", price: 1, trend: "up" }).success).toBe(false);
    expect(adminCoinSchema.safeParse({ symbol: "DAFT", price: 2, trend: "down" }).success).toBe(true);
  });
});
