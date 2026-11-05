import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dailyResults, summarize } from "@/lib/daily-results";
import { formatMoney, type ClosedTrade } from "@/lib/demo-positions";

const RANGES = [7, 15, 30] as const;
const signed = (v: number) => `${v > 0 ? "+" : ""}${formatMoney(v)}`;
const tone = (v: number) => (v > 0 ? "up" : v < 0 ? "down" : "flat");

export function DailyResults({ history, openPnl }: { history: ClosedTrade[]; openPnl: number }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);
  const rows = dailyResults(history, range);
  const s = summarize(rows);
  const today = rows[0]!;

  return (
    <section className="daily-results" aria-label="Daily results">
      <div className="daily-head">
        <div className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" /><h2 className="trade-heading">Daily results</h2></div>
        <div className="daily-range" role="group" aria-label="Period">
          {RANGES.map(r => <Button key={r} variant="ghost" className="timeframe-btn" data-active={range === r} aria-pressed={range === r} onClick={() => setRange(r)}>{r}D</Button>)}
        </div>
      </div>

      <div className="daily-summary">
        <div className="daily-stat daily-stat--wide"><span>Total realized · {range} days</span><strong data-tone={tone(s.total)}>{signed(s.total)}</strong></div>
        <div className="daily-stat"><span>Last 24h (today)</span><strong data-tone={tone(today.pnl)}>{signed(today.pnl)}</strong></div>
        <div className="daily-stat"><span>Open positions now</span><strong data-tone={tone(openPnl)}>{signed(openPnl)}</strong></div>
        <div className="daily-stat"><span>Profit / loss days</span><strong>{s.profitDays} / {s.lossDays}</strong></div>
        <div className="daily-stat"><span>Win rate</span><strong>{s.trades ? `${s.winRate.toFixed(0)}%` : "—"}</strong></div>
      </div>

      <div className="daily-grid">
        {rows.map((r, i) => {
          const pct = r.margin > 0 ? (r.pnl / r.margin) * 100 : 0;
          return (
            <div key={r.key} className="daily-day" data-tone={r.trades ? tone(r.pnl) : "empty"} aria-label={`${r.key}: ${r.trades} trades, ${signed(r.pnl)}`}>
              <div className="daily-day-top">
                <span className="daily-day-name">{i === 0 ? "Today" : new Date(r.start).toLocaleDateString("en-US", { weekday: "short" })}</span>
                <span className="daily-day-date">{new Date(r.start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </div>
              <strong className="daily-day-pnl">{r.trades ? signed(r.pnl) : "—"}</strong>
              <span className="daily-day-meta">{r.trades ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}% · ${r.trades} trade${r.trades > 1 ? "s" : ""}` : "No trades"}</span>
            </div>
          );
        })}
      </div>
      <p className="positions-footnote">Each card is one 24-hour day of closed trades. Results come from real market prices and can be negative; past results do not predict future profit.</p>
    </section>
  );
}
