import { describe, expect, it } from "vitest";
import { simulatedDaftQuote } from "@/lib/daft-simulation";
import { openDemoPosition, closeDemoPosition, positionStats, creditTestDeposit } from "@/lib/demo-positions";

const base = { symbol: "DAFT", price: 1.25, baseline_price: 1.25, baseline_at: "2026-10-11T00:00:00Z", updated_at: "2026-10-11T00:00:00Z", trend: "neutral", trend_until: null, version: 1 };
describe("Cloud DAFT simulated trading", () => {
  it("starts at the base and returns identical changing quotes for all visitors", () => {
    const start = Date.parse(base.updated_at);
    expect(simulatedDaftQuote(base, start).price).toBe(1.25);
    expect(simulatedDaftQuote(base, start + 10000)).toEqual(simulatedDaftQuote(base, start + 10000));
    expect(simulatedDaftQuote(base, start + 10000).price).not.toBe(1.25);
  });
  it("uses DAFT leverage for both sides, closes and persists history", () => {
    creditTestDeposit(1000);
    for (const side of ["Long", "Short"] as const) {
      const p = openDemoPosition({ pair: "DAFT/USDT", category: "Crypto", symbol: "DAFT", quote: "USDT", side, amount: 100, entryPrice: 1.25, leverage: 10 });
      expect(p.leverage).toBe(10);
      expect(positionStats(p, 1.25).qty).toBe(800);
      expect(p.liqPrice).toBeCloseTo(side === "Long" ? 1.125 : 1.375);
      const exit = side === "Long" ? 1.26 : 1.24;
      expect(positionStats(p, exit).pnl).toBeCloseTo(8);
      closeDemoPosition(p.id, exit);
      const raw = localStorage.getItem("vertex-test-account-v2") || localStorage.getItem("vertex-test-account-v1") || "{}";
      const state = JSON.parse(raw);
      expect(state.positions.some((row: { id: string }) => row.id === p.id)).toBe(false);
      expect(state.history[0].leverage).toBe(10);
      expect(state.history[0].pnl).toBeCloseTo(8);
    }
  });
  it("rejects invalid prices and unsupported leverage", () => {
    expect(() => simulatedDaftQuote({ ...base, price: 0 }, Date.now())).toThrow();
    expect(() => openDemoPosition({ pair: "DAFT/USDT", category: "Crypto", symbol: "DAFT", quote: "USDT", side: "Long", amount: 100, entryPrice: 1.25, leverage: 99 })).toThrow();
  });
});