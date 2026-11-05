import { useState, useEffect } from "react";
import { Bot, Clock, Lock, Sparkles } from "lucide-react";
import { BottomNavigation } from "@/components/bottom-navigation";
import { AssetIcon } from "@/components/asset-icon";
import { Button } from "@/components/ui/button";
import { cryptoAssetList } from "@/lib/external-market";
import { sampleAssets } from "@/lib/market-samples";
import { closeDemoPosition, formatMoney, positionStats, useTestAccount, type DemoPosition } from "@/lib/demo-positions";
import { useLivePrices, type LivePrice } from "@/hooks/use-live-prices";
import { DailyResults } from "@/components/daily-results";

function assetFor(pair: string) {
  return [...cryptoAssetList({}), ...sampleAssets.filter(a => a.category === "Forex")].find(a => a.pair === pair);
}

function PositionCard({ position, live, isNew }: { position: DemoPosition; live: LivePrice | null; isNew: boolean }) {
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!position.isAiTrade) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [position.isAiTrade]);

  const asset = assetFor(position.pair);
  const isLong = position.side === "LONG";
  // Close at the side you would exit on: bid for longs, ask for shorts.
  const exit = live ? (isLong ? (live.bid > 0 ? live.bid : live.last) : (live.ask > 0 ? live.ask : live.last)) : position.entryPrice;
  const currentPrice = live ? live.last : position.entryPrice;
  const { qty, sizeValue, pnl, pnlPercent, liqDistance } = positionStats(position, exit);
  const profitable = pnl >= 0;

  const isAi = !!position.isAiTrade;
  const planDays = position.planDays || 15;
  const dailyRate = position.dailyRate || (planDays === 25 ? 1.9 : planDays === 30 ? 2.2 : planDays === 60 ? 2.6 : 1.7);
  const dailyProfitAmount = position.dailyProfitAmount || (position.margin * dailyRate) / 100;
  const totalProjectedProfit = dailyProfitAmount * planDays;

  // Time remaining until plan expiry
  const expiresAt = position.expiresAt || (position.openedAt + planDays * 86400000);
  const msRemaining = Math.max(0, expiresAt - now);
  const daysLeft = Math.floor(msRemaining / 86400000);
  const hoursLeft = Math.floor((msRemaining % 86400000) / 3600000);
  const minsLeft = Math.floor((msRemaining % 3600000) / 60000);

  // Time until next daily profit credit (every 24 hours from openedAt)
  const elapsedMs = Math.max(0, now - position.openedAt);
  const msIntoCurrentDay = elapsedMs % 86400000;
  const msToNextProfit = 86400000 - msIntoCurrentDay;
  const nextHours = Math.floor(msToNextProfit / 3600000);
  const nextMins = Math.floor((msToNextProfit % 3600000) / 60000);
  const nextSecs = Math.floor((msToNextProfit % 60000) / 1000);
  const nextTimeStr = `${String(nextHours).padStart(2, "0")}h ${String(nextMins).padStart(2, "0")}m ${String(nextSecs).padStart(2, "0")}s`;

  const close = () => {
    if (isAi) {
      setNotice("🔒 AI Trade Locked: Manual close is restricted until strategy tenure maturity.");
      return;
    }
    if (!live) return;
    closeDemoPosition(position.id, exit);
    setNotice(null);
  };

  if (isAi) {
    return (
      <section className={`position-card${isNew ? " position-card--fresh" : ""}`} aria-label={`${position.pair} AI Trade`}>
        {/* Header */}
        <div className="position-card-head">
          <div className="position-identity">
            {asset && <AssetIcon asset={asset} />}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="position-pair">{position.pair}</h2>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 text-[10px] font-bold tracking-wide">
                  AI QUANT
                </span>
              </div>
              <p className="position-sub">Automated Quant Yield</p>
            </div>
          </div>
          <span className="rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2.5 py-1 text-xs font-semibold flex items-center gap-1.5">
            <Lock className="size-3 text-amber-400" /> Locked
          </span>
        </div>

        {/* 3 Clean Rooms / Tiles: Profit, Duration, Profit Rate */}
        <div className="grid grid-cols-3 gap-2 my-2.5">
          {/* Room 1: Profit */}
          <div className="rounded-xl border border-border/80 bg-secondary/30 p-2.5 text-center">
            <span className="text-[11px] font-medium text-muted-foreground block">Profit</span>
            <strong className="text-sm font-bold text-foreground font-mono mt-0.5 block">
              +{formatMoney(dailyProfitAmount)}
            </strong>
          </div>

          {/* Room 2: Duration */}
          <div className="rounded-xl border border-border/80 bg-secondary/30 p-2.5 text-center">
            <span className="text-[11px] font-medium text-muted-foreground block">Duration</span>
            <strong className="text-sm font-bold text-foreground font-mono mt-0.5 block">
              {planDays} Days
            </strong>
          </div>

          {/* Room 3: Profit Rate */}
          <div className="rounded-xl border border-border/80 bg-secondary/30 p-2.5 text-center">
            <span className="text-[11px] font-medium text-muted-foreground block">Profit Rate</span>
            <strong className="text-sm font-bold text-foreground font-mono mt-0.5 block">
              {dailyRate}% / day
            </strong>
          </div>
        </div>

        {/* Clean Footer Info: Invested & Next Settlement */}
        <div className="flex items-center justify-between px-1 py-1 text-xs text-muted-foreground border-t border-border/50">
          <span>Frozen in trade: <strong className="text-amber-300 font-mono">{formatMoney(position.margin)}</strong></span>
          <span>Next 24h profit: <strong className="text-emerald-400 font-mono">{nextTimeStr}</strong></span>
        </div>

        {/* Clean Lock Status Banner */}
        <div className="mt-2 flex flex-col items-center justify-center gap-1 rounded-xl border border-border/60 bg-secondary/20 p-2 text-center text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Lock className="size-3.5 text-amber-400" />
            <span>24h profits are auto-credited to Available Balance</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Capital ({formatMoney(position.margin)}) unlocks to Available Balance when the plan period completes.
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className={`position-card${isNew ? " position-card--fresh" : ""}`} aria-label={`${position.pair} ${position.side} position`}>
      <div className="position-card-head">
        <div className="position-identity">
          {asset && <AssetIcon asset={asset} />}
          <div>
            <h2 className="position-pair">{position.pair}</h2>
            <p className="position-sub">{live ? position.symbol === "DAFT" ? "DAFT price" : "Live price" : "Waiting for live price"}</p>
          </div>
        </div>
        <div className="position-head-actions">
          <Button variant="outline" size="sm" onClick={() => setNotice("TP/SL editing is not available yet.")}>TP/SL</Button>
        </div>
      </div>

      <div className="position-badges">
        <span className={`side-badge ${isLong ? "side-long" : "side-short"}`}>{position.side}</span>
        <span className="leverage-badge">{position.leverage}x</span>
        {isNew && <span className="fresh-badge">Just opened</span>}
        <span className="pnl-badge">{pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(1)}%</span>
      </div>

      <dl className="position-grid">
        <div><dt>Size</dt><dd>{qty.toLocaleString("en-US", { maximumFractionDigits: 5 })} {position.symbol}</dd><dd className="position-dim">{formatMoney(sizeValue)}</dd></div>
        <div><dt>Margin</dt><dd>{formatMoney(position.margin)}</dd></div>
        <div><dt>Current Price</dt><dd>{formatMoney(currentPrice, currentPrice < 10 ? 4 : 1)}</dd></div>
        <div><dt>Entry Price</dt><dd>{formatMoney(position.entryPrice, position.entryPrice < 10 ? 4 : 1)}</dd></div>
        <div><dt>Liq. Price</dt><dd>{position.liqPrice > 0 ? formatMoney(position.liqPrice, position.liqPrice < 10 ? 4 : 1) : "—"}</dd></div>
        <div><dt>Unrealized PnL</dt><dd className="position-pnl">{pnl >= 0 ? "+" : ""}{formatMoney(pnl)}</dd></div>
      </dl>

      <div className="liq-block">
        <div className="liq-row">
          <span>Distance to Liquidation</span>
          <span className="liq-value">{liqDistance.toFixed(1)}%</span>
        </div>
        <div className="liq-track" role="progressbar" aria-valuenow={liqDistance} aria-valuemin={0} aria-valuemax={100} aria-label="Distance to liquidation">
          <div className="liq-fill" style={{ width: `${Math.min(liqDistance * 4, 100)}%` }} />
        </div>
      </div>

      <Button variant={profitable ? "destructive" : "outline"} className="close-position-btn" onClick={close} disabled={!live}>
        {pnl > 0 ? `Close Position · Take ${formatMoney(pnl)} profit` : "Close Position"}
      </Button>

      {notice && (
        <p className="position-notice mt-2 rounded-lg bg-amber-500/15 border border-amber-500/30 p-2 text-xs text-amber-300 text-center font-medium" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}

export function PositionsPage() {
  const { positions, availableBalance, frozenBalance, totalBalance, history, lastOpenedId } = useTestAccount();
  const { get } = useLivePrices();
  const openPnl = positions.reduce((sum, p) => {
    const live = get(p);
    if (!live) return sum;
    const exit = p.side === "LONG" ? (live.bid > 0 ? live.bid : live.last) : (live.ask > 0 ? live.ask : live.last);
    return sum + positionStats(p, exit).pnl;
  }, 0);

  return (
    <div className="exchange-shell">
      <header className="markets-header">
        <div>
          <h1 className="markets-title">Positions</h1>
          <p className="markets-subtitle text-xs text-muted-foreground">
            Available: <span className="text-emerald-400 font-medium font-mono">{formatMoney(availableBalance)}</span> · Frozen: <span className="text-amber-400 font-medium font-mono">{formatMoney(frozenBalance)}</span>
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Total Balance</span>
          <span className="demo-label font-bold text-foreground font-mono">{formatMoney(totalBalance)}</span>
        </div>
      </header>

      <main className="positions-list">
        {positions.length === 0 && (
          <p className="positions-footnote">No open positions. Open a trade from the Trade page and it will appear here.</p>
        )}
        {positions.map(p => <PositionCard key={p.id} position={p} live={get(p)} isNew={p.id === lastOpenedId} />)}
        <DailyResults history={history} openPnl={openPnl} />
        <h2 className="trade-heading" style={{ marginTop: 8 }}>Trade history</h2>
        {history.length === 0 ? <p className="positions-footnote">Closed trades will be saved here.</p> : history.map(h => (
          <section key={h.id} className="position-card" aria-label={`${h.pair} closed trade`}>
            <div className="position-card-head">
              <div><h3 className="position-pair">{h.pair} <span className={h.side === "LONG" ? "text-primary" : "text-destructive"}>{h.side}</span></h3>
                <p className="position-sub">Closed {new Date(h.closedAt).toLocaleString()}</p></div>
              <div className={`text-right font-semibold ${h.pnl >= 0 ? "text-primary" : "text-destructive"}`}>{h.pnl >= 0 ? "+" : ""}{formatMoney(h.pnl)}<div className="position-sub">{h.pnlPercent >= 0 ? "+" : ""}{h.pnlPercent.toFixed(2)}%</div></div>
            </div>
            <dl className="position-grid">
              <div><dt>Margin</dt><dd>{formatMoney(h.margin)}</dd></div>
              <div><dt>Entry</dt><dd>{formatMoney(h.entryPrice, h.entryPrice < 10 ? 4 : 1)}</dd></div>
              <div><dt>Exit</dt><dd>{formatMoney(h.exitPrice, h.exitPrice < 10 ? 4 : 1)}</dd></div>
            </dl>
          </section>
        ))}
        {positions.length > 0 && (
          <p className="positions-footnote">Prices are live from Binance / Bybit / OKX / ER-API.</p>
        )}
      </main>

      <BottomNavigation active="Positions" />
    </div>
  );
}
