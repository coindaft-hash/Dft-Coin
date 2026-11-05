import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getCryptoCandles, type LiveCandle } from "@/lib/candles.functions";
import { useLivePrices, fmtLive } from "@/hooks/use-live-prices";
import { Bell, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNavigation } from "@/components/bottom-navigation";
import { cryptoAssetList } from "@/lib/external-market";
import { sampleAssets } from "@/lib/market-samples";
import { formatPrice, timeframes, type Timeframe } from "@/lib/demo-candles";
import { formatMoney, openDemoPosition, useTestAccount } from "@/lib/demo-positions";

type Candle = LiveCandle;

function useCandles(symbol: string, timeframe: Timeframe, enabled: boolean) {
  const fetchCandles = useServerFn(getCryptoCandles);
  const query = useQuery({
    queryKey: ["market-candles", symbol, timeframe],
    enabled,
    queryFn: async () => {
      const response = await fetchCandles({ data: { symbol, interval: timeframe } });
      if (!response.ok) throw new Error(response.message);
      return response.candles;
    },
    staleTime: 15_000,
    refetchInterval: 15_000,
    retry: false,
  });
  return { candles: enabled ? query.data ?? [] : [], error: query.isError ? "Chart service unavailable" : "" };
}

function CandleChart({ candles }: { candles: Candle[] }) {
  const width = 400, height = 220, pad = 8;
  const max = Math.max(...candles.map(c => c.high)), min = Math.min(...candles.map(c => c.low));
  const y = (v: number) => pad + ((max - v) / (max - min || 1)) * (height - pad * 2);
  const step = width / candles.length;
  return <svg className="trade-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Live candlestick chart">
    {[0.25, 0.5, 0.75].map(f => <line key={f} x1={0} x2={width} y1={height * f} y2={height * f} className="chart-grid"/>)}
    {candles.map((c, i) => {
      const x = i * step + step / 2, up = c.close >= c.open;
      return <g key={i} className={up ? "candle-up" : "candle-down"}>
        <line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)}/>
        <rect x={x - step * 0.32} width={step * 0.64} y={y(Math.max(c.open, c.close))} height={Math.max(1, Math.abs(y(c.open) - y(c.close)))}/>
      </g>;
    })}
  </svg>;
}

export function TradePage() {
  const [pair, setPair] = useState("BTC/USDT");
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [side, setSide] = useState<"Long" | "Short">("Long");
  const [daftLeverage, setDaftLeverage] = useState(1);
  const [size, setSize] = useState("100");
  const [tpOn, setTpOn] = useState(false);
  const [slOn, setSlOn] = useState(false);
  const [tp, setTp] = useState("");
  const [sl, setSl] = useState("");
  const navigate = useNavigate();
  const [notice, setNotice] = useState("");
  const { get, crypto } = useLivePrices();
  const assets = [...cryptoAssetList(crypto.coins as any), ...sampleAssets.filter(a => a.category === "Forex")];
  const asset = assets.find(a => a.pair === pair) ?? sampleAssets.find(a => a.pair === pair);
  const { availableBalance, tradingPower, usableTrialMargin, trialActive } = useTestAccount();
  const live = asset ? get(asset) : null;
  const isCrypto = asset?.category === "Crypto";
  // Market order fills at ask for Long, bid for Short (last price if the book is unavailable).
  const price = live ? (side === "Long" ? (live.ask > 0 ? live.ask : live.last) : (live.bid > 0 ? live.bid : live.last)) : 0;
  const { candles, error: chartError } = useCandles(asset?.symbol ?? "BTC", timeframe, isCrypto && (asset?.symbol === "DAFT" || sampleAssets.some(a => a.symbol === asset?.symbol)));
  const priceText = live ? fmtLive(live.last) : "—";
  const amount = Number(size);
  const leverage = asset?.symbol === "DAFT" ? daftLeverage : 1;
  const qty = amount > 0 && price > 0 ? amount * leverage / price : 0;
  const dir = side === "Long" ? 1 : -1;
  const tpValue = Number(tp), slValue = Number(sl);
  const tpError = tpOn && tp && (dir * (tpValue - price) <= 0) ? `Take profit must be ${side === "Long" ? "above" : "below"} entry` : "";
  const slError = slOn && sl && (dir * (price - slValue) <= 0) ? `Stop loss must be ${side === "Long" ? "below" : "above"} entry` : "";
  const hasTrialFund = trialActive && usableTrialMargin > 0;
  const sizeError = size && !(amount > 0)
    ? "Enter an amount above 0"
    : amount > availableBalance
      ? (hasTrialFund
          ? "The $20 trial fund is restricted strictly to 3-day Auto AI Robot Trading. Deposit funds to trade manually."
          : `Amount exceeds available balance (${formatMoney(availableBalance)})`)
      : "";
  const valid = !!live && amount > 0 && amount <= availableBalance && !tpError && !slError && (!tpOn || tpValue > 0) && (!slOn || slValue > 0);
  const pnl = (target: number) => (dir * (target - price) * qty);
  const reset = () => setNotice("");

  const presets = availableBalance <= 25 ? ["5", "10", "15", "20"] : ["10", "25", "50", "100"];

  return <div className="exchange-shell trade-page">
    <header className="exchange-header"><div className="brand"><svg className="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M3 7h7l6 13 6-13h7L16 30 3 7Z" fill="currentColor"/><path d="m12 3 4 8 4-8h-8Z" fill="currentColor"/></svg><span>vertex<span className="text-primary">.</span></span></div><div className="flex items-center gap-4"><Bell className="size-5 text-muted-foreground" strokeWidth={1.7} aria-label="Notifications"/><div className="account-avatar" aria-label="Account">JD</div></div></header>
    <main>
      <div className="welcome">
        <div className="min-w-0"><h1>Trade</h1><p>Manual trading with live quotes</p></div>
        <div className="flex flex-col items-end gap-1">
          <span className="demo-label shrink-0"><span className="status-dot"/>Available: {formatMoney(availableBalance)}</span>
          {hasTrialFund && (
            <span className="text-[10px] text-emerald-400 font-medium">+$20 Trial Fund (AI Auto Trade Only)</span>
          )}
        </div>
      </div>

      {hasTrialFund && availableBalance <= 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-emerald-950/60 to-[#0e1f2d] border border-emerald-500/30 p-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="text-slate-200">
              Your <strong>$20 Free Trial Fund</strong> is reserved exclusively for <strong>3-Day Auto AI Robot Trading</strong>.
            </span>
          </div>
          <Link
            to="/ai-trade"
            className="shrink-0 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 transition-colors"
          >
            Launch AI Robot Trade →
          </Link>
        </div>
      )}
      <section className="trade-card">
        <div className="trade-symbol-row">
          <select className="trade-select" aria-label="Market symbol" value={pair} onChange={e => { setPair(e.target.value); setTp(""); setSl(""); reset(); }}>
            <optgroup label="Crypto">{assets.filter(a => a.category === "Crypto").map(a => <option key={a.pair} value={a.pair}>{a.pair}</option>)}</optgroup>
            <optgroup label="Forex">{sampleAssets.filter(a => a.category === "Forex").map(a => <option key={a.pair} value={a.pair}>{a.pair}</option>)}</optgroup>
          </select>
          <div className="text-right"><div className="trade-price">{priceText}</div><div className={live && live.change >= 0 ? "text-primary trade-change" : "text-destructive trade-change"}>{live ? `${live.change >= 0 ? "+" : ""}${Number.isFinite(live.change) ? live.change.toFixed(2) : "—"}%` : (asset?.symbol === "DAFT" ? crypto.daftMessage : crypto.message) || "Waiting for current price…"}</div></div>
        </div>
        <div className="timeframe-row" role="group" aria-label="Timeframe">{timeframes.map(t => <Button key={t} variant="ghost" className="timeframe-btn" aria-pressed={timeframe === t} data-active={timeframe === t} onClick={() => setTimeframe(t)}>{t}</Button>)}</div>
        {candles.length > 0 ? <CandleChart candles={candles}/> : <div className="trade-chart grid place-items-center text-xs text-muted-foreground">{!isCrypto ? "Live forex chart is not available on the current data plan." : chartError || "Loading live chart…"}</div>}
        <p className="trade-footnote">{chartError && candles.length > 0 ? "Delayed chart · " : ""}{asset?.symbol === "DAFT" ? "DAFT · Vertex price feed." : isCrypto ? "Price and candles from live exchange feeds (Binance first, Bybit/OKX fallback)." : "Forex price from a keyless reference feed (ER-API)."}</p>
      </section>

      <section className="trade-card">
        <div className="side-toggle" role="group" aria-label="Order side">
          <Button variant="ghost" className="side-btn side-long" data-active={side === "Long"} aria-pressed={side === "Long"} onClick={() => { setSide("Long"); reset(); }}>Long</Button>
          <Button variant="ghost" className="side-btn side-short" data-active={side === "Short"} aria-pressed={side === "Short"} onClick={() => { setSide("Short"); reset(); }}>Short</Button>
        </div>
        {asset?.symbol === "DAFT" && <label className="trade-field"><span>Leverage</span><select className="trade-select" aria-label="DAFT leverage" value={daftLeverage} onChange={e => setDaftLeverage(Number(e.target.value))}>{[1, 2, 5, 10, 20, 30].map(value => <option key={value} value={value}>{value}x</option>)}</select></label>}
        <label className="trade-field"><span>Order size ({asset?.quote})</span><Input inputMode="decimal" type="number" min="0" value={size} onChange={e => { setSize(e.target.value); reset(); }} aria-invalid={!!sizeError}/></label>
        {sizeError && <p className="trade-error">{sizeError}</p>}
        <div className="size-presets">{presets.map(v => <Button key={v} variant="ghost" className="timeframe-btn" data-active={size === v} onClick={() => { setSize(v); reset(); }}>{v}</Button>)}</div>
        {([["Take Profit", tpOn, setTpOn, tp, setTp, tpError], ["Stop Loss", slOn, setSlOn, sl, setSl, slError]] as const).map(([label, on, setOn, val, setVal, err]) => <div key={label} className="tpsl-block">
          <label className="tpsl-toggle"><input type="checkbox" checked={on} onChange={e => { setOn(e.target.checked); reset(); }}/><span>{label}</span></label>
          {on && <><Input type="number" inputMode="decimal" aria-label={`${label} price`} placeholder={`Trigger price (entry ${priceText})`} value={val} onChange={e => { setVal(e.target.value); reset(); }} aria-invalid={!!err}/>{err && <p className="trade-error">{err}</p>}</>}
        </div>)}
      </section>

      <section className="trade-card">
        <h2 className="trade-heading">Order summary</h2>
        <dl className="trade-summary">
          <div><dt>Market</dt><dd>{pair}</dd></div>
          <div><dt>Side</dt><dd className={side === "Long" ? "text-primary" : "text-destructive"}>{side}</dd></div>
          <div><dt>{asset?.symbol === "DAFT" ? "Entry" : "Entry (live)"}</dt><dd>{live ? fmtLive(price) : "—"}</dd></div>
          {asset?.symbol === "DAFT" && <div><dt>Leverage</dt><dd>{leverage}x</dd></div>}
          <div><dt>Available balance</dt><dd>{formatMoney(availableBalance)}</dd></div>
          {trialActive && usableTrialMargin > 0 && (
            <div><dt>Trial fund</dt><dd className="text-emerald-400 font-mono text-xs">+{formatMoney(usableTrialMargin)} (AI Robot Trade Only)</dd></div>
          )}
          <div><dt>Manual trading limit</dt><dd className="font-bold text-foreground font-mono">{formatMoney(availableBalance)}</dd></div>
          <div><dt>Size</dt><dd>{amount > 0 ? `${amount.toLocaleString()} ${asset?.quote}` : "—"}</dd></div>
          <div><dt>Est. quantity</dt><dd>{qty ? `${formatPrice(qty)} ${asset?.symbol}` : "—"}</dd></div>
          <div><dt>Take profit</dt><dd>{tpOn && tpValue > 0 && !tpError ? `${tp} (${pnl(tpValue) >= 0 ? "+" : ""}${pnl(tpValue).toFixed(2)})` : "Off"}</dd></div>
          <div><dt>Stop loss</dt><dd>{slOn && slValue > 0 && !slError ? `${sl} (${pnl(slValue).toFixed(2)})` : "Off"}</dd></div>
        </dl>
        <Button className={`w-full trade-submit ${side === "Short" ? "trade-submit-short" : ""}`} disabled={!valid} onClick={() => {
          if (!asset || !valid) {
            if (hasTrialFund && amount > availableBalance) {
              setNotice("The $20 trial fund is restricted strictly to 3-day Auto AI Robot Trading. Deposit funds to trade manually.");
            }
            return;
          }
          const current = get(asset);
          if (!current) { setNotice("Current price unavailable. Please retry."); return; }
          const entryPrice = side === "Long" ? current.ask > 0 ? current.ask : current.last : current.bid > 0 ? current.bid : current.last;
          try {
            openDemoPosition({ pair, category: asset.category, side, amount, entryPrice, symbol: asset.symbol, quote: asset.quote, leverage });
            setNotice(`${side} ${pair} opened at ${fmtLive(price)} with ${amount.toLocaleString()} ${asset?.quote}. See it on the Positions page.`);
            navigate({ to: "/positions" });
          } catch (err: any) {
            setNotice(err?.message || "Trade order failed.");
          }
        }}>Open {side}</Button>
        {notice && <p className="trade-notice" role="status"><ShieldCheck className="size-4 shrink-0"/>{notice}</p>}
        <p className="trade-footnote">Executes at live market prices.</p>
      </section>
    </main>
    <BottomNavigation active="Trade"/>
  </div>;
}
