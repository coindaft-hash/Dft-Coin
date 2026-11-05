export type Candle = { open: number; high: number; low: number; close: number };
export const timeframes = ["1m", "5m", "15m", "1h", "4h", "1D"] as const;
export type Timeframe = (typeof timeframes)[number];

const volatility: Record<Timeframe, number> = { "1m": 0.0015, "5m": 0.003, "15m": 0.005, "1h": 0.009, "4h": 0.016, "1D": 0.03 };

export function parsePrice(price: string) {
  return Number(price.replace(/,/g, ""));
}

// Deterministic demo candles that end at the sample price. Not market data.
export function generateDemoCandles(pair: string, timeframe: Timeframe, lastPrice: number, count = 40): Candle[] {
  let seed = [...(pair + timeframe)].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7) >>> 0;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const vol = volatility[timeframe];
  const closes: number[] = [lastPrice];
  for (let i = 1; i < count; i++) closes.unshift(closes[0]! * (1 + (random() - 0.5) * 2 * vol));
  return closes.map((close, i) => {
    const open = i === 0 ? close * (1 + (random() - 0.5) * vol) : closes[i - 1]!;
    const high = Math.max(open, close) * (1 + random() * vol * 0.6);
    const low = Math.min(open, close) * (1 - random() * vol * 0.6);
    return { open, high, low, close };
  });
}

export function formatPrice(value: number) {
  const digits = value >= 1000 ? 2 : value >= 1 ? 4 : 6;
  return value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
