import type { DaftQuote } from "@/lib/daftcoin.functions";

// Shared, time-based simulated market; no browser randomness or fabricated exchange quotes.
// An admin-set trend drifts the price ~0.15%/min while now < trend_until, then stops.
const DRIFT_PER_MINUTE = 0.0015;

export function simulatedDaftQuote(base: DaftQuote, now: number): DaftQuote {
  const start = Date.parse(base.updated_at);
  if (!(Number(base.price) > 0) || !Number.isFinite(start)) throw new Error("DAFT market unavailable");
  // Signed elapsed: historical candle lookups (now < start) extrapolate the same wave backwards.
  const elapsed = (now - start) / 1000;
  const wave = (t: number) => 1 + 0.004 * Math.sin(t / 3) + 0.003 * Math.sin(t / 7) + 0.002 * Math.sin(t / 19) + 0.001 * Math.sin(t / 53);
  const until = base.trend_until ? Date.parse(base.trend_until) : NaN;
  const dir = base.trend === "up" ? 1 : base.trend === "down" ? -1 : 0;
  const drift = (t: number) => {
    if (!dir || !Number.isFinite(until)) return 1;
    const windowMinutes = (until - start) / 60000;
    const effective = Math.min(Math.max(t / 60, 0), windowMinutes);
    return 1 + dir * DRIFT_PER_MINUTE * effective;
  };
  const price = Number((Number(base.price) * wave(elapsed) * drift(elapsed)).toFixed(8));
  const previous = Number(base.price) * wave(elapsed - 2) * drift(elapsed - 2);
  const baseline = elapsed > 86400 ? Number(base.price) * wave(elapsed - 86400) * drift(elapsed - 86400) : Number(base.baseline_price);
  return { ...base, price, baseline_price: baseline, updated_at: new Date(now).toISOString(), trend: price > previous ? "up" : price < previous ? "down" : "neutral" };
}