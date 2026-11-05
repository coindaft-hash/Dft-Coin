import { describe, expect, it } from "vitest";
import { dailyResults, summarize } from "@/lib/daily-results";

const now = new Date(2026, 9, 20, 15, 0, 0).getTime();
const at = (daysAgo: number, hour = 10) => new Date(2026, 9, 20 - daysAgo, hour).getTime();

describe("dailyResults", () => {
  it("returns one row per day for the chosen period, newest first", () => {
    const rows = dailyResults([], 7, now);
    expect(rows).toHaveLength(7);
    expect(rows[0]!.key).toBe("2026-10-20");
    expect(rows[6]!.key).toBe("2026-10-14");
  });

  it("sums closed trades into their own day, including losses", () => {
    const rows = dailyResults([
      { pnl: 12, margin: 100, closedAt: at(0) },
      { pnl: -5, margin: 50, closedAt: at(0, 1) },
      { pnl: -8, margin: 100, closedAt: at(2) },
    ], 7, now);
    expect(rows[0]!.pnl).toBe(7);
    expect(rows[0]!.trades).toBe(2);
    expect(rows[2]!.pnl).toBe(-8);
    expect(rows[1]!.trades).toBe(0);
  });

  it("ignores trades older than the period", () => {
    const rows = dailyResults([{ pnl: 50, margin: 100, closedAt: at(7) }], 7, now);
    expect(summarize(rows).total).toBe(0);
  });

  it("counts profit and loss days and win rate", () => {
    const s = summarize(dailyResults([
      { pnl: 10, margin: 100, closedAt: at(0) },
      { pnl: -4, margin: 100, closedAt: at(1) },
      { pnl: 6, margin: 100, closedAt: at(1, 2) },
    ], 7, now));
    expect(s.profitDays).toBe(2);
    expect(s.lossDays).toBe(0);
    expect(s.winRate).toBeCloseTo(66.67, 1);
  });
});
