import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bot,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Zap,
  Activity,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Coins,
  ChevronRight,
  Flame,
  PlusCircle,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNavigation } from "@/components/bottom-navigation";
import { useTestAccount, creditTestDeposit, formatMoney } from "@/lib/demo-positions";
import {
  AI_PLANS,
  type AiPlan,
  type ActiveBot,
  type AiTradeLog,
  launchAiBot,
  claimBotProfit,
  stopBot,
  useAiTradingStore,
  calculatePendingProfit,
  calculateTotalProjectedProfit,
  generateLiveTrades,
} from "@/lib/ai-trade-service";
import aiRobotImg from "@/assets/ai-robot.png";
import { toast } from "sonner";

export function AiTradeView() {
  const navigate = useNavigate();
  const { balance } = useTestAccount();
  const { bots } = useAiTradingStore();

  const [selectedPlanId, setSelectedPlanId] = useState<string>("15d");
  const [investAmount, setInvestAmount] = useState<string>("1000");
  const [activeTab, setActiveTab] = useState<"plans" | "active" | "live">("plans");
  const [liveTrades, setLiveTrades] = useState<AiTradeLog[]>(() => generateLiveTrades(6));
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Real-time ticker: update profit every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate new incoming live arbitrage trade signals
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTrades((prev) => {
        const next = generateLiveTrades(1)[0]!;
        return [next, ...prev.slice(0, 7)];
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const selectedPlan = useMemo(() => {
    return AI_PLANS.find((p) => p.id === selectedPlanId) || AI_PLANS[0]!;
  }, [selectedPlanId]);

  const numAmount = Number(investAmount) || 0;
  const dailyProfit = (numAmount * selectedPlan.dailyRate) / 100;
  const totalProfit = calculateTotalProjectedProfit(numAmount, selectedPlan.dailyRate, selectedPlan.durationDays);
  const totalReturn = numAmount + totalProfit;

  const isValidAmount = numAmount >= selectedPlan.minAmount && numAmount <= selectedPlan.maxAmount;
  const hasSufficientBalance = balance >= numAmount && numAmount > 0;

  // Active running bots
  const runningBots = bots.filter((b) => b.status === "running");
  const completedBots = bots.filter((b) => b.status === "completed");

  const totalActiveInvested = runningBots.reduce((sum, b) => sum + b.investedAmount, 0);
  const totalAccruedPending = runningBots.reduce((sum, b) => sum + calculatePendingProfit(b, now), 0);
  const totalHistoricalProfit = bots.reduce((sum, b) => sum + b.claimedProfit, 0);

  function handleQuickAmount(amt: number) {
    setInvestAmount(String(amt));
  }

  function handleMaxAmount() {
    const maxPossible = Math.min(balance, selectedPlan.maxAmount);
    setInvestAmount(String(Math.floor(maxPossible)));
  }

  function handleTopUpDemo() {
    creditTestDeposit(5000);
    toast.success("Added $5,000 USDT demo trading funds to your wallet!");
  }

  function handleActivateBot() {
    if (!isValidAmount) {
      toast.error(`Investment must be between $${selectedPlan.minAmount} and $${selectedPlan.maxAmount}`);
      return;
    }
    if (!hasSufficientBalance) {
      toast.error("Insufficient wallet balance. Top up your balance below.");
      return;
    }

    setIsActivating(true);
    setTimeout(() => {
      try {
        // Deduct from balance and launch bot
        creditTestDeposit(-numAmount);
        launchAiBot(selectedPlan.id, numAmount);
        toast.success(`Successfully activated ${selectedPlan.name} (${selectedPlan.durationDays} Days @ ${selectedPlan.dailyRate}%/day)!`);
        setIsActivating(false);
        setActiveTab("active");
      } catch (err: any) {
        toast.error(err?.message || "Failed to launch bot");
        setIsActivating(false);
      }
    }, 600);
  }

  function handleClaimProfit(bot: ActiveBot) {
    setClaimingId(bot.id);
    const profit = claimBotProfit(bot.id);
    setTimeout(() => {
      if (profit > 0) {
        creditTestDeposit(profit);
        toast.success(`Claimed +${formatMoney(profit)} profit to your wallet!`);
      } else {
        toast.info("No unclaimed profit accumulated yet. Check back shortly!");
      }
      setClaimingId(null);
    }, 300);
  }

  function handleStopBot(bot: ActiveBot) {
    if (confirm(`Stop ${bot.planName}? Your principal of ${formatMoney(bot.investedAmount)} and any uncollected profit will be credited back.`)) {
      const { principal, profit } = stopBot(bot.id);
      if (principal > 0 || profit > 0) {
        creditTestDeposit(principal + profit);
        toast.success(`Bot completed: Returned ${formatMoney(principal + profit)} to your wallet balance.`);
      }
    }
  }

  return (
    <div className="exchange-shell min-h-screen bg-background pb-24 text-foreground selection:bg-primary/20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="size-9 rounded-full hover:bg-secondary">
              <Link to="/" aria-label="Back to home">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-emerald-950/40 p-1 ring-1 ring-primary/40 shadow-sm shadow-primary/20">
                <img src={aiRobotImg} alt="" className="size-6 object-contain animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold tracking-tight text-foreground sm:text-lg">AI Trade System</h1>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE V3.8
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Automated Yield & High-Frequency Multi-Market Bots</p>
              </div>
            </div>
          </div>

          {/* Quick Balance Badge */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Available Balance</span>
              <p className="text-sm font-bold text-foreground sm:text-base">{formatMoney(balance)}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleTopUpDemo}
              className="h-8 gap-1.5 rounded-lg border-primary/30 bg-primary/10 px-2.5 text-xs font-semibold text-primary hover:bg-primary/20"
              title="Add $5,000 Demo Balance"
            >
              <PlusCircle className="size-3.5" />
              <span className="hidden sm:inline">Add Funds</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 space-y-6">
        {/* Top AI Performance Matrix */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">24h AI Volume</span>
              <Activity className="size-4 text-primary" />
            </div>
            <p className="mt-1.5 text-base font-bold tracking-tight text-foreground sm:text-lg">$4,892,150</p>
            <span className="text-[11px] font-medium text-emerald-400">+18.4% today</span>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Arbitrage Win Rate</span>
              <Zap className="size-4 text-amber-400" />
            </div>
            <p className="mt-1.5 text-base font-bold tracking-tight text-foreground sm:text-lg">96.8%</p>
            <span className="text-[11px] font-medium text-muted-foreground">1,840 trades / 24h</span>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Active Running Bots</span>
              <Bot className="size-4 text-cyan-400" />
            </div>
            <p className="mt-1.5 text-base font-bold tracking-tight text-foreground sm:text-lg">
              {runningBots.length} <span className="text-xs font-normal text-muted-foreground">({runningBots.length + 2841} network)</span>
            </p>
            <span className="text-[11px] font-medium text-cyan-400">Total: {formatMoney(totalActiveInvested)}</span>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Total Profit Generated</span>
              <TrendingUp className="size-4 text-emerald-400" />
            </div>
            <p className="mt-1.5 text-base font-bold tracking-tight text-emerald-400 sm:text-lg">
              {formatMoney(totalHistoricalProfit + totalAccruedPending)}
            </p>
            <span className="text-[11px] font-medium text-muted-foreground">Instant Daily Claim</span>
          </div>
        </section>

        {/* Tab Selection */}
        <div className="flex rounded-xl border border-border bg-card/80 p-1">
          <button
            onClick={() => setActiveTab("plans")}
            className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold transition-all sm:text-sm ${
              activeTab === "plans"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Select Plan & Launch Bot
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={`relative flex-1 rounded-lg py-2 text-center text-xs font-semibold transition-all sm:text-sm ${
              activeTab === "active"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            My Active Bots ({runningBots.length})
            {totalAccruedPending > 0.1 && (
              <span className="ml-1.5 inline-block size-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("live")}
            className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold transition-all sm:text-sm ${
              activeTab === "live"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Live AI Executions
          </button>
        </div>

        {/* TAB 1: PLANS & LAUNCHER */}
        {activeTab === "plans" && (
          <div className="space-y-6">
            {/* Section: Plan Selection */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-foreground">Select AI Yield Duration</h2>
                  <p className="text-xs text-muted-foreground">Choose your investment tenure and guaranteed daily return rate</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3.5 text-emerald-400" />
                  <span>Principal 100% Protected</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
                {AI_PLANS.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`group relative cursor-pointer overflow-hidden rounded-2xl border p-4 transition-all duration-200 ${
                        isSelected
                          ? `border-primary bg-gradient-to-b ${plan.colorScheme.bg} shadow-lg ring-2 ring-primary/40 ${plan.colorScheme.glow}`
                          : "border-border/80 bg-card/70 hover:border-border hover:bg-card/90"
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-bold text-foreground">
                          {plan.durationDays} Days
                        </span>
                        {plan.badge && (
                          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ${plan.colorScheme.badgeBg}`}>
                            {plan.id === "15d" ? "1.7% DAILY" : plan.id === "25d" ? "1.9% DAILY" : plan.id === "30d" ? "2.2% DAILY" : "2.5% DAILY"}
                          </span>
                        )}
                      </div>

                      {/* Daily Rate Highlight */}
                      <div className="mt-3">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black tracking-tight text-foreground">{plan.dailyRate}%</span>
                          <span className="text-xs font-semibold text-muted-foreground">/ Day</span>
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-emerald-400">
                          Total Return: +{plan.totalRate}% profit
                        </p>
                      </div>

                      {/* Strategy Title & Specs */}
                      <div className="mt-3.5 border-t border-border/50 pt-2.5 text-xs space-y-1">
                        <p className="font-semibold text-foreground line-clamp-1">{plan.name}</p>
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>Min: ${plan.minAmount}</span>
                          <span>Max: ${plan.maxAmount >= 1000 ? `${plan.maxAmount / 1000}k` : plan.maxAmount}</span>
                        </div>
                      </div>

                      {/* Selected Indicator */}
                      <div className="mt-3 flex items-center justify-between pt-1">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {plan.strategy.split(" ")[0]} Strategy
                        </span>
                        <div
                          className={`grid size-5 place-items-center rounded-full transition-colors ${
                            isSelected ? "bg-primary text-primary-foreground" : "border border-muted-foreground/30"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="size-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section: Investment Calculator & Bot Launcher */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Left Column: Input Form (7 cols) */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-5 lg:col-span-7">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="size-5 text-primary" />
                    <h3 className="text-sm font-bold text-foreground sm:text-base">Investment Amount</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Available: <strong className="text-foreground">{formatMoney(balance)}</strong>
                  </span>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type="number"
                      min={selectedPlan.minAmount}
                      max={selectedPlan.maxAmount}
                      value={investAmount}
                      onChange={(e) => setInvestAmount(e.target.value)}
                      placeholder={`Min $${selectedPlan.minAmount}`}
                      className="h-14 rounded-xl border-border bg-background/80 pr-16 text-xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary"
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                      <span>USDT</span>
                    </div>
                  </div>

                  {/* Range hint */}
                  <div className="flex justify-between text-xs text-muted-foreground px-1">
                    <span>Min: ${selectedPlan.minAmount} USDT</span>
                    <span>Max: ${selectedPlan.maxAmount.toLocaleString()} USDT</span>
                  </div>
                </div>

                {/* Quick Selection Preset Chips */}
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Quick Select:</span>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {[100, 300, 500, 1000, 2500, 5000].map((amt) => {
                      const disabled = amt < selectedPlan.minAmount || amt > selectedPlan.maxAmount;
                      const active = numAmount === amt;
                      return (
                        <Button
                          key={amt}
                          type="button"
                          variant={active ? "default" : "outline"}
                          size="sm"
                          disabled={disabled}
                          onClick={() => handleQuickAmount(amt)}
                          className={`h-9 text-xs font-semibold ${
                            active
                              ? "bg-primary text-primary-foreground"
                              : "border-border/80 bg-background/50 hover:bg-secondary text-foreground"
                          }`}
                        >
                          ${amt}
                        </Button>
                      );
                    })}
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleMaxAmount}
                      className="h-7 text-xs font-semibold text-primary hover:text-primary/80 p-0"
                    >
                      Use Max Balance ({formatMoney(balance)})
                    </Button>
                  </div>
                </div>

                {/* Warnings / Top up helpers */}
                {!hasSufficientBalance && numAmount > 0 && (
                  <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="size-4 shrink-0 text-amber-400" />
                      <span>Wallet balance ({formatMoney(balance)}) is lower than {formatMoney(numAmount)}.</span>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleTopUpDemo}
                      className="h-7 text-xs font-bold text-foreground"
                    >
                      Top Up +$5k
                    </Button>
                  </div>
                )}

                {/* Submit Launch Bot Button */}
                <Button
                  onClick={handleActivateBot}
                  disabled={!isValidAmount || !hasSufficientBalance || isActivating}
                  className="w-full h-13 rounded-xl bg-gradient-to-r from-primary via-emerald-600 to-teal-600 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-95 transition-all"
                >
                  {isActivating ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="size-4 animate-spin" /> Deploying Neural Bot…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="size-4" />
                      Deploy {selectedPlan.durationDays}-Day AI Bot ({formatMoney(numAmount || 0)})
                    </span>
                  )}
                </Button>
              </div>

              {/* Right Column: Live Projected Returns Breakdown (5 cols) */}
              <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-card via-card/90 to-background p-5 shadow-sm space-y-4 lg:col-span-5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-foreground sm:text-base">Real-Time Profit Forecast</h3>
                </div>

                <div className="rounded-xl border border-border/60 bg-background/70 p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Selected Plan</span>
                    <strong className="text-foreground">{selectedPlan.name}</strong>
                  </div>

                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Plan Duration</span>
                    <span className="font-semibold text-foreground">{selectedPlan.durationDays} Days</span>
                  </div>

                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Daily Return Rate</span>
                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-bold text-emerald-400">
                      +{selectedPlan.dailyRate}% / day
                    </span>
                  </div>

                  <div className="border-t border-border/60 pt-2 flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Daily Expected Payout</span>
                    <span className="text-base font-extrabold text-emerald-400">
                      +{formatMoney(dailyProfit)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Total Period Profit</span>
                    <span className="text-base font-extrabold text-emerald-400">
                      +{formatMoney(totalProfit)} ({selectedPlan.totalRate}%)
                    </span>
                  </div>

                  <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-foreground">Total Payout at Maturity</p>
                      <span className="text-[10px] text-muted-foreground">Principal + All Accrued Profit</span>
                    </div>
                    <span className="text-lg font-black text-foreground sm:text-xl">
                      {formatMoney(totalReturn)}
                    </span>
                  </div>
                </div>

                {/* Key Guarantees */}
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 shrink-0 text-emerald-400" />
                    <span><strong>100% Capital Return:</strong> Full principal returned automatically.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 shrink-0 text-cyan-400" />
                    <span><strong>Daily Accrual:</strong> Profits accumulate continuously every second.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="size-4 shrink-0 text-amber-400" />
                    <span><strong>Instant Claim:</strong> Withdraw profit to wallet anytime with 0 fees.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY ACTIVE BOTS */}
        {activeTab === "active" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">Active Trading Bots</h2>
                <p className="text-xs text-muted-foreground">Real-time tracking and profit extraction for your running AI positions</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab("plans")}
                className="gap-1.5 text-xs font-semibold"
              >
                <PlusCircle className="size-3.5" />
                Launch New Bot
              </Button>
            </div>

            {runningBots.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Bot className="size-6" />
                </div>
                <h3 className="mt-3 text-base font-bold text-foreground">No Active AI Bots Running</h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                  Deploy an AI trading bot on a 15, 25, or 30-day tenure to generate automated daily profits.
                </p>
                <Button
                  onClick={() => setActiveTab("plans")}
                  className="mt-4 rounded-xl font-bold bg-primary text-primary-foreground"
                >
                  Explore AI Plans
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {runningBots.map((bot) => {
                  const pending = calculatePendingProfit(bot, now);
                  const totalDays = bot.durationDays;
                  const elapsedMs = Math.max(0, now - bot.startedAt);
                  const totalMs = totalDays * 86400 * 1000;
                  const progressPct = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));

                  const msRemaining = Math.max(0, bot.expiresAt - now);
                  const daysLeft = Math.floor(msRemaining / (86400 * 1000));
                  const hoursLeft = Math.floor((msRemaining % (86400 * 1000)) / (3600 * 1000));
                  const minsLeft = Math.floor((msRemaining % (3600 * 1000)) / (60 * 1000));

                  const isClaiming = claimingId === bot.id;

                  return (
                    <div
                      key={bot.id}
                      className="overflow-hidden rounded-2xl border border-border/90 bg-card p-5 shadow-sm transition-all hover:border-border hover:shadow-md space-y-4"
                    >
                      {/* Top Bot Badge */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
                            <Bot className="size-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-sm font-bold text-foreground">{bot.planName}</h3>
                              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                                {bot.dailyRate}% / DAY
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {bot.durationDays}-Day Tenure · ID: {bot.id.slice(0, 14)}
                            </p>
                          </div>
                        </div>

                        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/25">
                          <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                          RUNNING
                        </span>
                      </div>

                      {/* Financial Metrics */}
                      <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 bg-background/60 p-3">
                        <div>
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Invested Capital
                          </span>
                          <p className="text-sm font-extrabold text-foreground">{formatMoney(bot.investedAmount)}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Daily Target
                          </span>
                          <p className="text-sm font-extrabold text-emerald-400">
                            +{formatMoney((bot.investedAmount * bot.dailyRate) / 100)} / day
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Claimed Profit
                          </span>
                          <p className="text-sm font-semibold text-foreground">{formatMoney(bot.claimedProfit)}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Pending To Claim
                          </span>
                          <p className="text-sm font-extrabold text-emerald-400 animate-pulse">
                            +{formatMoney(pending, 4)}
                          </p>
                        </div>
                      </div>

                      {/* Time Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Tenure Progress</span>
                          <span className="font-semibold text-foreground">
                            {daysLeft}d {hoursLeft}h {minsLeft}m remaining
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          onClick={() => handleClaimProfit(bot)}
                          disabled={pending <= 0.005 || isClaiming}
                          className="flex-1 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-xs font-bold text-white shadow-sm"
                        >
                          {isClaiming ? "Claiming…" : `Claim +${formatMoney(pending)} Profit`}
                        </Button>
                        <Button
                          onClick={() => handleStopBot(bot)}
                          variant="outline"
                          size="sm"
                          className="h-10 text-xs font-semibold text-muted-foreground hover:text-destructive"
                        >
                          Stop & Return
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Historical Completed Bots */}
            {completedBots.length > 0 && (
              <div className="mt-8 space-y-3">
                <h3 className="text-sm font-bold text-foreground">Completed AI Trading Cycles</h3>
                <div className="rounded-xl border border-border bg-card divide-y divide-border">
                  {completedBots.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3.5 text-xs">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="size-4 text-emerald-400" />
                        <div>
                          <p className="font-bold text-foreground">{b.planName} ({b.durationDays}d)</p>
                          <span className="text-muted-foreground">Invested {formatMoney(b.investedAmount)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-emerald-400">+{formatMoney(b.claimedProfit)} Profit</p>
                        <span className="text-[11px] text-muted-foreground">Cycle Completed</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LIVE AI EXECUTIONS */}
        {activeTab === "live" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">Real-Time Neural Order Stream</h2>
                <p className="text-xs text-muted-foreground">Live arbitrage & quantitative trade executions across global spot liquidity</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                Live Feed
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-secondary/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Market / Asset</th>
                      <th className="px-4 py-3">Strategy</th>
                      <th className="px-4 py-3">Side</th>
                      <th className="px-4 py-3">Execution Price</th>
                      <th className="px-4 py-3 text-right">Profit Captured</th>
                      <th className="px-4 py-3 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {liveTrades.map((t) => (
                      <tr key={t.id} className="transition-colors hover:bg-secondary/30">
                        <td className="px-4 py-3 font-bold text-foreground">{t.pair}</td>
                        <td className="px-4 py-3 text-muted-foreground">{t.strategy}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${
                              t.side === "BUY" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                            }`}
                          >
                            {t.side}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-foreground">
                          ${t.price.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                          +{t.profitPercent}% (+${t.profitUsd})
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {Math.floor((now - t.timestamp) / 1000)}s ago
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation active="Home" />
    </div>
  );
}
