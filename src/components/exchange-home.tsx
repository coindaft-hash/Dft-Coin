import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ArrowLeftRight, Bell, Bot, ChevronDown, ChevronRight, Eye, EyeOff, Plus, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/bottom-navigation";
import { AssetIcon } from "@/components/asset-icon";
import { useLivePrices, fmtLive, type LivePrice } from "@/hooks/use-live-prices";
import { MyInviteCode } from "@/components/my-invite-code";
import { useTestAccount } from "@/lib/demo-positions";
import { useAccount } from "@/hooks/use-account";
import { TrialFundModal, FloatingTrialFundWidget } from "@/components/trial-fund-modal";
import { useTrialFund } from "@/lib/trial-fund";
import aiRobot from "@/assets/ai-robot.png";

type Market = { symbol: string; quote: string; name: string; price: string; volume: string; change: string; icon: string; color: string; category?: "Crypto" | "Forex" };
const cryptoMarkets: Market[] = [
  { symbol: "BTC", quote: "USDT", name: "Bitcoin", price: "67,432.80", volume: "Vol 1.42B", change: "+2.34%", icon: "₿", color: "bitcoin" },
  { symbol: "ETH", quote: "USDT", name: "Ethereum", price: "3,521.65", volume: "Vol 842.6M", change: "+1.87%", icon: "Ξ", color: "ethereum" },
  { symbol: "SOL", quote: "USDT", name: "Solana", price: "172.48", volume: "Vol 326.8M", change: "−0.62%", icon: "≋", color: "solana" },
  { symbol: "BNB", quote: "USDT", name: "BNB", price: "598.32", volume: "Vol 215.4M", change: "+0.95%", icon: "◇", color: "bitcoin" },
];
const forexMarkets: Market[] = [
  { symbol: "EUR", quote: "USD", name: "Euro / US Dollar", price: "1.08425", volume: "Euro", change: "+0.24%", icon: "€", color: "forex" },
  { symbol: "GBP", quote: "USD", name: "British Pound / US Dollar", price: "1.27348", volume: "British Pound", change: "+0.18%", icon: "£", color: "ethereum" },
  { symbol: "USD", quote: "JPY", name: "US Dollar / Japanese Yen", price: "151.624", volume: "US Dollar", change: "−0.32%", icon: "¥", color: "bitcoin" },
  { symbol: "AUD", quote: "USD", name: "Australian Dollar / US Dollar", price: "0.65872", volume: "Australian Dollar", change: "+0.41%", icon: "$", color: "solana" },
];

function MarketRow({ market, live }: { market: Market; live: LivePrice | null }) {
  const change = live && Number.isFinite(live.change) ? `${live.change >= 0 ? "+" : "−"}${Math.abs(live.change).toFixed(2)}%` : "—";
  return <div className="market-row">
    <div className="coin-identity"><AssetIcon asset={market}/><div className="min-w-0"><div className="pair-name">{market.symbol}<span className="pair-quote"> / {market.quote}</span></div><div className="coin-name truncate">{market.name}</div></div></div>
    <div className="market-price">{live ? fmtLive(live.last) : "Unavailable"}<div className="market-volume">{market.volume}</div></div>
    <div className={`change ${change.startsWith("−") ? "negative" : ""}`}>{change}</div>
  </div>;
}

export function ExchangeHome() {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [marketTab, setMarketTab] = useState("Crypto");
  const { getDisplay: get, crypto, forex } = useLivePrices();
  const marketStatus = marketTab === "Forex" ? forex.status : crypto.status;
  const { availableBalance, frozenBalance, totalBalance } = useTestAccount();
  const { account } = useAccount();
  const trial = useTrialFund();
  const money = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [whole, cents] = money(totalBalance).split(".");
  const actions: { name: string; icon: typeof Plus; primary?: boolean; to: "/deposit" | "/withdraw" | "/transfer" | "/trade" | "/ai-trade" | null }[] = [{ name: "Deposit", icon: Plus, primary: true, to: "/deposit" }, { name: "Withdraw", icon: ArrowUpRight, to: "/withdraw" }, { name: "Transfer", icon: ArrowLeftRight, to: "/transfer" }, { name: "AI Trade", icon: Bot, to: "/ai-trade" }];
  return <div className="exchange-shell">
    <TrialFundModal />
    <FloatingTrialFundWidget />
    <header className="exchange-header"><div className="brand"><svg className="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M3 7h7l6 13 6-13h7L16 30 3 7Z" fill="currentColor"/><path d="m12 3 4 8 4-8h-8Z" fill="currentColor"/></svg><span>vertex<span className="text-primary">.</span></span></div><div className="flex items-center gap-4"><Bell className="size-5 text-muted-foreground" strokeWidth={1.7} aria-label="Notifications" /><Link to="/profile" className="account-avatar" aria-label="Open profile">{account?.initials ?? "V"}</Link></div></header>
    <main><div className="welcome"><div className="min-w-0"><h1>Your next move.</h1><p>A clear view of your trading world.</p></div></div>
      <div className="home-grid"><div>
        <section className="balance-card" aria-label="Account overview"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-xs text-muted-foreground font-medium">Total balance</span><Button variant="ghost" size="icon" className="size-7 text-muted-foreground" aria-label={balanceVisible ? "Hide balance" : "Show balance"} onClick={() => setBalanceVisible(!balanceVisible)}>{balanceVisible ? <Eye className="size-3.5"/> : <EyeOff className="size-3.5"/>}</Button></div><span className="flex items-center gap-1 text-[10px] text-muted-foreground">USD<ChevronDown className="size-3"/></span></div>
          <div className="balance-number">{balanceVisible ? <>${whole}<span className="decimals">.{cents}</span></> : "$••,•••.••"}</div>
          <div className="profit" style={{ color: frozenBalance > 0 ? "#f59e0b" : "var(--muted-foreground)" }}><Lock className="size-3.5"/><span>{balanceVisible ? `$${money(frozenBalance)} Frozen in trade` : "•••"}</span></div>
          <div className="balance-footer"><div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" /><span>Available balance</span></div><strong className="text-sm font-bold text-foreground font-mono">{balanceVisible ? `$${money(availableBalance)}` : "$••,•••.••"}</strong></div>
        </section>

        {!trial.isExpired && (
          <button
            type="button"
            onClick={trial.openModal}
            className="my-3 w-full rounded-2xl bg-gradient-to-r from-[#14263f] via-[#0e1d32] to-[#14263f] border border-emerald-500/35 p-3.5 text-left flex items-center justify-between gap-3 shadow-lg shadow-black/30 hover:border-emerald-400 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="relative size-10 shrink-0 rounded-xl bg-emerald-500/15 border border-emerald-500/40 p-1 flex items-center justify-center">
                <img src={aiRobot} alt="Robot" className="size-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <span>$20.00 Welcome Trial Fund</span>
                  <span className="text-[10px] text-emerald-400 font-mono">({trial.remainingHours}h left)</span>
                </div>
                <div className="text-[11px] text-emerald-300/80">
                  {trial.tradeActive ? "● AI Robot is Trading Now · Tap to view" : "Risk-Free 3-Day AI Trading · Tap to claim"}
                </div>
              </div>
            </div>
            <ChevronRight className="size-4 text-emerald-400 shrink-0" />
          </button>
        )}

        <MyInviteCode />
        <div className="quick-actions" aria-label="Account actions">{actions.map(({name, icon: Icon, primary, to}) => <div className="quick-action" key={name}>{to ? <Button asChild variant={primary ? "default" : "secondary"} size="icon" className={`action-icon ${name === "AI Trade" ? "ai-trade-btn" : ""}`} title={name}><Link to={to} aria-label={name}>{name === "AI Trade" ? <img src={aiRobot} alt="" width={30} height={30} className="ai-robot-img"/> : <Icon className="size-5" strokeWidth={1.8}/>}</Link></Button> : <Button variant={primary ? "default" : "secondary"} size="icon" className="action-icon" disabled title={name} aria-label={name}><Icon className="size-5" strokeWidth={1.8}/></Button>}<span>{name}</span></div>)}</div>
        <section className="promotion"><div className="min-w-0"><span className="eyebrow">One account. More possibilities.</span><h2>Crypto meets forex.</h2><p>Global markets, all in one place.</p><div className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-primary"><span>24/7 crypto</span><span className="text-muted-foreground">·</span><span>Major FX pairs</span></div></div><svg className="promo-coins" viewBox="0 0 110 110" fill="none" role="img" aria-label="Crypto and currency coins"><ellipse cx="74" cy="56" rx="27" ry="32" transform="rotate(24 74 56)" fill="currentColor" fillOpacity=".1" stroke="currentColor" strokeOpacity=".45"/><text x="61" y="67" fill="currentColor" fontSize="29" fontFamily="sans-serif">$</text><ellipse cx="44" cy="61" rx="29" ry="34" transform="rotate(-18 44 61)" fill="var(--promo-background)" stroke="currentColor" strokeWidth="2"/><ellipse cx="44" cy="61" rx="24" ry="29" transform="rotate(-18 44 61)" stroke="currentColor" strokeOpacity=".3"/><text x="30" y="74" fill="currentColor" fontSize="36" fontFamily="sans-serif" transform="rotate(-18 44 61)">₿</text><path d="M86 17v10m-5-5h10M15 89v8m-4-4h8" stroke="currentColor" strokeOpacity=".6" strokeWidth="1.5"/></svg></section>
      </div><section className="markets" aria-label="Market overview"><div className="section-title"><h2>Market overview</h2><span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="status-dot" data-status={marketStatus}/>{marketStatus === "live" ? "Live prices" : marketStatus === "loading" ? "Connecting…" : marketStatus === "delayed" ? "Delayed" : "Disconnected"}</span></div><div className="market-tabs" role="tablist" aria-label="Market type">{["Crypto", "Forex", "Watchlist"].map(tab => <Button key={tab} role="tab" aria-selected={tab === marketTab} variant="ghost" className="market-tab" data-active={tab === marketTab} onClick={() => setMarketTab(tab)}>{tab}</Button>)}</div><div role="tabpanel" aria-label={marketTab}><div className="market-columns"><span>Pair / Volume</span><span>Last price</span><span>24h change</span></div>{(marketTab === "Forex" ? forexMarkets : marketTab === "Watchlist" ? cryptoMarkets.slice(0,2) : cryptoMarkets).map(market => <MarketRow key={market.symbol + market.quote} market={market} live={get({ category: market.quote === "USDT" ? "Crypto" : "Forex", symbol: market.symbol, pair: `${market.symbol}/${market.quote}` })}/>)}</div><div className="market-footnote"><ShieldCheck className="size-3"/><span>External market prices</span></div></section></div>
    </main><BottomNavigation/>
  </div>;
}