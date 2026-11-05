import type { ClosedTrade } from "@/lib/demo-positions";

export type DayResult = { key: string; start: number; pnl: number; trades: number; wins: number; losses: number; margin: number };

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Groups closed trades into local calendar days (each 24-hour day), newest first.
 * Only realized results from closed trades are counted — nothing is projected.
 */
export function dailyResults(history: Pick<ClosedTrade, "pnl" | "margin" | "closedAt">[], days: number, now = Date.now()): DayResult[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const out: DayResult[] = [];
  const index = new Map<string, DayResult>();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const row: DayResult = { key: dayKey(d), start: d.getTime(), pnl: 0, trades: 0, wins: 0, losses: 0, margin: 0 };
    out.push(row);
    index.set(row.key, row);
  }
  for (const t of history) {
    if (!Number.isFinite(t.closedAt) || !Number.isFinite(t.pnl)) continue;
    const row = index.get(dayKey(new Date(t.closedAt)));
    if (!row) continue;
    row.pnl += t.pnl;
    row.trades += 1;
    row.margin += t.margin;
    if (t.pnl > 0) row.wins += 1;
    else if (t.pnl < 0) row.losses += 1;
  }
  return out;
}

export function summarize(rows: DayResult[]) {
  const active = rows.filter(r => r.trades > 0);
  const total = rows.reduce((s, r) => s + r.pnl, 0);
  const trades = rows.reduce((s, r) => s + r.trades, 0);
  const wins = rows.reduce((s, r) => s + r.wins, 0);
  return {
    total,
    trades,
    profitDays: active.filter(r => r.pnl > 0).length,
    lossDays: active.filter(r => r.pnl < 0).length,
    activeDays: active.length,
    winRate: trades > 0 ? (wins / trades) * 100 : 0,
    best: active.length ? Math.max(...active.map(r => r.pnl)) : 0,
    worst: active.length ? Math.min(...active.map(r => r.pnl)) : 0,
  };
}
