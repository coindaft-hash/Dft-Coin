import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BottomNavigation } from "@/components/bottom-navigation";
import { useLivePrices } from "@/hooks/use-live-prices";
import { openDemoPosition, useTestAccount } from "@/lib/demo-positions";
import { TrialFundModal, FloatingTrialFundWidget } from "@/components/trial-fund-modal";

const DAFT = { category: "Crypto" as const, symbol: "DAFT", pair: "DAFT/USDT" };

export function AiTradeFrame() {
  const frame = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const { availableBalance, frozenBalance, totalBalance, tradingPower, usableTrialMargin, trialActive } = useTestAccount();
  const { get } = useLivePrices();
  const latest = useRef({ balance: availableBalance, tradingPower, usableTrialMargin, get });
  latest.current = { balance: availableBalance, tradingPower, usableTrialMargin, get };

  const post = (data: object) => frame.current?.contentWindow?.postMessage(data, window.location.origin);

  useEffect(() => {
    post({
      type: "ai-trade-balance",
      balance: availableBalance,
      frozen: frozenBalance,
      total: totalBalance,
      tradingPower,
      trialFund: usableTrialMargin,
      trialActive,
    });
  }, [availableBalance, frozenBalance, totalBalance, tradingPower, usableTrialMargin, trialActive]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      if (e.data?.type === "ai-trade-view") navigate({ to: "/positions" });
      if (e.data?.type !== "ai-trade-start") return;
      const amount = Number(e.data.amount) || 20;
      const planDays = Number(e.data.planDays) || 3;
      const dailyRate = Number(e.data.dailyRate) || (planDays === 25 ? 1.9 : planDays === 30 ? 2.2 : planDays === 60 ? 2.6 : 2.0);
      
      if (latest.current.tradingPower < amount) {
        post({
          type: "ai-trade-error",
          message: `Insufficient trading balance ($${latest.current.tradingPower.toFixed(2)} available). Adjust your amount.`,
        });
        return;
      }

      const quote = latest.current.get(DAFT);
      const entryPrice = quote && (quote.ask > 0 ? quote.ask : quote.last) ? (quote.ask > 0 ? quote.ask : quote.last) : 1.8425;
      try {
        const now = Date.now();
        const expiresAt = now + planDays * 86400 * 1000;
        const nextProfitAt = now + 86400 * 1000;
        const dailyProfitAmount = (amount * dailyRate) / 100;
        openDemoPosition({
          ...DAFT,
          side: "Long",
          amount,
          entryPrice,
          quote: "USDT",
          leverage: 1,
          isAiTrade: true,
          planDays,
          dailyRate,
          expiresAt,
          nextProfitAt,
          dailyProfitAmount,
        });
      } catch (err) {
        post({ type: "ai-trade-error", message: err instanceof Error ? err.message : "Trade failed" });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [navigate]);

  return <div className="exchange-shell">
    <TrialFundModal />
    <FloatingTrialFundWidget />
    <iframe
      ref={frame}
      src="/ai-trade.html"
      title="AI Trade"
      className="block w-full border-0"
      style={{ height: "calc(100dvh - 72px)" }}
      onLoad={() => post({
        type: "ai-trade-balance",
        balance: latest.current.balance,
        frozen: frozenBalance,
        total: totalBalance,
        tradingPower: latest.current.tradingPower,
        trialFund: latest.current.usableTrialMargin,
      })}
    />
    <BottomNavigation />
  </div>;
}
