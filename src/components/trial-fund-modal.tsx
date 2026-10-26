import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bot, CheckCircle2, ChevronRight, Clock, Sparkles, TrendingUp, X, Zap, ShieldCheck } from "lucide-react";
import { useTrialFund } from "@/lib/trial-fund";
import aiRobotImg from "@/assets/ai-robot.png";

export function RobotAvatar({ size = "md", busy = false }: { size?: "sm" | "md" | "lg"; busy?: boolean }) {
  const dim = size === "lg" ? "size-24" : size === "sm" ? "size-10" : "size-16";
  return (
    <div className={`relative ${dim} flex items-center justify-center shrink-0`}>
      {/* Tech glow aura */}
      <div className={`absolute inset-0 rounded-full bg-emerald-500/20 blur-md ${busy ? "animate-pulse" : ""}`} />
      <div className="absolute -inset-1 rounded-full border border-emerald-500/30 border-dashed animate-[spin_12s_linear_infinite]" />
      <div className="relative size-full rounded-2xl bg-gradient-to-b from-[#14233b] to-[#0c1626] border border-emerald-500/40 p-1 flex items-center justify-center shadow-lg shadow-emerald-500/10 overflow-hidden">
        <img
          src={aiRobotImg}
          alt="Vertex AI Trading Robot"
          className={`size-full object-contain ${busy ? "scale-105" : "hover:scale-105"} transition-transform duration-300`}
        />
        {busy && (
          <span className="absolute top-1 right-1 flex size-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
          </span>
        )}
      </div>
    </div>
  );
}

export function TrialFundModal() {
  const navigate = useNavigate();
  const {
    amount,
    isExpired,
    claimed,
    tradeActive,
    totalEarnedProfit,
    modalDismissed,
    formattedCountdown,
    remainingHours,
    startTrade,
    dismissModal,
  } = useTrialFund();

  const [starting, setStarting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  // If expired or user closed the modal, do not render the full screen modal
  if (isExpired || modalDismissed) return null;

  const handleStartTrade = () => {
    setStarting(true);
    setTimeout(() => {
      startTrade();
      setStarting(false);
      setSuccessNotice(true);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-[#0e1a2b] via-[#09121f] to-[#070d18] text-foreground shadow-2xl shadow-emerald-950/60 p-5 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Welcome Trial Fund"
      >
        {/* Subtle background tech grid */}
        <div className="absolute -top-24 -right-24 size-48 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 size-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={dismissModal}
          className="absolute top-4 right-4 z-10 grid size-8 place-items-center rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
          aria-label="Close trial fund popup"
        >
          <X className="size-4" />
        </button>

        {/* Header with Robot */}
        <div className="flex flex-col items-center text-center pt-2">
          <RobotAvatar size="lg" busy={tradeActive || starting} />

          {/* Robot Speech Bubble */}
          <div className="relative mt-3 max-w-[90%] rounded-2xl bg-[#14233b]/90 border border-emerald-500/30 px-3.5 py-2 text-xs font-medium text-emerald-300 shadow-inner">
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#14233b] border-t border-l border-emerald-500/30 rotate-45" />
            <p className="relative z-10 flex items-center justify-center gap-1.5">
              <Sparkles className="size-3.5 text-emerald-400 shrink-0" />
              <span>
                {tradeActive
                  ? "AI Engine is actively trading for you. Relax and watch your profits grow!"
                  : "Hello Trader! I am Vertex AI Robot. Your $20.00 trial fund is ready!"}
              </span>
            </p>
          </div>

          <h2 className="mt-4 text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>Welcome AI Trial Fund</span>
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Experience algorithmic trading completely risk-free for 3 days.
          </p>
        </div>

        {/* Big Amount Card */}
        <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-950/40 via-[#0e2133] to-emerald-950/40 p-4 text-center relative overflow-hidden">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/80">
            Frozen Trial Fund Balance
          </div>
          <div className="mt-1 text-4xl font-extrabold font-mono tracking-tight text-emerald-400 drop-shadow-md">
            ${amount.toFixed(2)}
            <span className="text-sm font-sans font-medium text-muted-foreground ml-1.5">USDT</span>
          </div>

          <p className="mt-1.5 text-[11px] text-slate-300">
            Available: <strong className="text-white">$0.00</strong> · Frozen Balance: <strong className="text-emerald-400">$20.00</strong>
          </p>

          {/* 3-day countdown badge */}
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-mono font-medium text-emerald-300">
            <Clock className="size-3.5 text-emerald-400 animate-pulse" />
            <span>Active for: {formattedCountdown}</span>
          </div>
        </div>

        {/* Feature bullets */}
        <div className="mt-4 space-y-2 text-xs text-slate-300">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] border border-white/5 p-2.5">
            <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <Zap className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-white">Exclusive 3-Day Auto AI Robot Trading</div>
              <div className="text-[11px] text-muted-foreground">
                This $20 trial fund operates exclusively with the automated <strong>3-Day AI Robot</strong> (manual trading with trial fund is disabled).
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] border border-white/5 p-2.5">
            <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-white">3 Days Validity · Keep All Profits</div>
              <div className="text-[11px] text-muted-foreground">
                After 3 days, the $20 principal is deducted automatically. All trading profits stay in your available wallet!
              </div>
            </div>
          </div>
        </div>

        {/* Trade Active Status or Activation Button */}
        <div className="mt-5 pt-1 space-y-2">
          {tradeActive ? (
            <div className="space-y-2">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-center">
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-400">
                  <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                  </span>
                  <span>AI Trading Bot is Running</span>
                </div>
                <div className="mt-1 text-sm font-mono text-white">
                  Total Profit Settled: <strong className="text-emerald-400">+${totalEarnedProfit.toFixed(2)} USDT</strong>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    dismissModal();
                    navigate({ to: "/ai-trade" });
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-xs hover:bg-emerald-400 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Bot className="size-3.5" />
                  <span>AI Terminal</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dismissModal();
                    navigate({ to: "/positions" });
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/10 text-white font-medium text-xs hover:bg-white/15 transition-colors"
                >
                  View Position
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                disabled={starting}
                onClick={handleStartTrade}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:from-emerald-400 hover:to-teal-300 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                {starting ? (
                  <span>Activating Vertex AI Bot...</span>
                ) : (
                  <>
                    <Bot className="size-4" />
                    <span>Start $20 AI Trade (2.0%/day)</span>
                    <ChevronRight className="size-4" />
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    dismissModal();
                    navigate({ to: "/trade" });
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-semibold text-xs hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <TrendingUp className="size-3.5" />
                  <span>Trade by Hand</span>
                </button>
                <button
                  type="button"
                  onClick={dismissModal}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/10 text-white font-medium text-xs hover:bg-white/15 transition-colors cursor-pointer"
                >
                  Browse App
                </button>
              </div>
            </div>
          )}

          <div className="text-center pt-1">
            <span className="text-[11px] text-muted-foreground">
              Valid for {remainingHours} more hours · Principal reclaimed after 3 days · You keep 100% profit
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Floating chip that stays visible on the Exchange Home screen during the 3-day trial period
 */
export function FloatingTrialFundWidget() {
  const { isExpired, amount, tradeActive, remainingHours, remainingMinutes, openModal } = useTrialFund();

  if (isExpired) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40 animate-in slide-in-from-bottom-4 duration-300">
      <button
        onClick={openModal}
        className="group flex items-center gap-2.5 rounded-full bg-[#0d1829]/95 border border-emerald-500/40 py-1.5 pl-2 pr-3.5 shadow-xl shadow-black/50 backdrop-blur-md hover:border-emerald-400 transition-all active:scale-95"
        title="Open $20 Trial Fund"
        aria-label="View $20 Welcome Trial Fund"
      >
        <div className="relative size-8 shrink-0 rounded-full bg-emerald-500/20 border border-emerald-500/50 p-0.5 flex items-center justify-center overflow-hidden">
          <img src={aiRobotImg} alt="Robot" className="size-full object-contain" />
          <span className="absolute top-0 right-0 flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
          </span>
        </div>
        <div className="text-left leading-tight">
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
            <span>${amount} Trial Fund</span>
            {tradeActive && <span className="text-[9px] text-white/80">· LIVE</span>}
          </div>
          <div className="text-[10px] text-slate-300 font-mono">
            {remainingHours}h {remainingMinutes}m left
          </div>
        </div>
      </button>
    </div>
  );
}
