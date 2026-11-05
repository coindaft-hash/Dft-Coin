/**
 * Real AI Trading System Service
 * Manages 15-day (1.7%), 25-day (1.9%), 30-day (2.2%), and 45-day (2.5%) automated AI trading bots,
 * real-time profit accrual, live execution logs, and balance synchronization.
 */

import { useSyncExternalStore } from "react";

export type AiPlan = {
  id: string;
  name: string;
  durationDays: number;
  dailyRate: number; // in %
  totalRate: number; // in %
  minAmount: number;
  maxAmount: number;
  strategy: string;
  risk: "Conservative" | "Balanced" | "High Yield" | "Elite";
  badge?: string;
  description: string;
  colorScheme: {
    border: string;
    bg: string;
    text: string;
    badgeBg: string;
    glow: string;
  };
};

export const AI_PLANS: AiPlan[] = [
  {
    id: "15d",
    name: "Quant Arbitrage Engine",
    durationDays: 15,
    dailyRate: 1.7,
    totalRate: 25.5,
    minAmount: 100,
    maxAmount: 10000,
    strategy: "High-Frequency Spread Arbitrage",
    risk: "Conservative",
    badge: "15 Days · 1.7%/day",
    description: "Low-latency triangular spread scanning across Binance, Bybit & OKX spot markets.",
    colorScheme: {
      border: "border-emerald-500/50 hover:border-emerald-400",
      bg: "from-emerald-500/15 via-teal-950/20 to-background",
      text: "text-emerald-400",
      badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      glow: "shadow-emerald-500/20",
    },
  },
  {
    id: "25d",
    name: "Neural Grid Scalper",
    durationDays: 25,
    dailyRate: 1.9,
    totalRate: 47.5,
    minAmount: 300,
    maxAmount: 50000,
    strategy: "Multi-Market Dynamic Volatility Grid",
    risk: "Balanced",
    badge: "25 Days · 1.9%/day · Popular",
    description: "Autonomous grid parameter tuning using recurrent neural networks to capture swing momentum.",
    colorScheme: {
      border: "border-cyan-500/50 hover:border-cyan-400",
      bg: "from-cyan-500/15 via-sky-950/20 to-background",
      text: "text-cyan-400",
      badgeBg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      glow: "shadow-cyan-500/20",
    },
  },
  {
    id: "30d",
    name: "Deep Alpha Trend Matrix",
    durationDays: 30,
    dailyRate: 2.2,
    totalRate: 66.0,
    minAmount: 500,
    maxAmount: 100000,
    strategy: "Deep Learning Trend Following & Breakout",
    risk: "High Yield",
    badge: "30 Days · 2.2%/day · Best Yield",
    description: "Multi-factor predictive models maximizing compound returns across crypto & forex trends.",
    colorScheme: {
      border: "border-amber-500/50 hover:border-amber-400",
      bg: "from-amber-500/15 via-orange-950/20 to-background",
      text: "text-amber-400",
      badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      glow: "shadow-amber-500/20",
    },
  },
  {
    id: "45d",
    name: "Institutional Quantum Matrix",
    durationDays: 45,
    dailyRate: 2.5,
    totalRate: 112.5,
    minAmount: 1000,
    maxAmount: 250000,
    strategy: "Cross-Asset Market Making & Liquidity Alpha",
    risk: "Elite",
    badge: "45 Days · 2.5%/day · VIP Tier",
    description: "Institutional liquidity provisioning with zero-exposure delta hedging and peak APR.",
    colorScheme: {
      border: "border-purple-500/50 hover:border-purple-400",
      bg: "from-purple-500/15 via-fuchsia-950/20 to-background",
      text: "text-purple-400",
      badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      glow: "shadow-purple-500/20",
    },
  },
];

export type ActiveBot = {
  id: string;
  planId: string;
  planName: string;
  durationDays: number;
  dailyRate: number;
  investedAmount: number;
  startedAt: number;
  expiresAt: number;
  lastClaimAt: number;
  claimedProfit: number;
  status: "running" | "completed" | "stopped";
  executedTradesCount: number;
};

export type AiTradeLog = {
  id: string;
  pair: string;
  side: "BUY" | "SELL";
  price: number;
  profitPercent: number;
  profitUsd: number;
  strategy: string;
  timestamp: number;
};

const BOTS_STORAGE_KEY = "vx-ai-trading-bots-v2";

type AiStoreState = {
  bots: ActiveBot[];
  totalVolume24h: number;
};

function loadStoredBots(): ActiveBot[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(BOTS_STORAGE_KEY);
    if (!raw) {
      // Seed an active demo bot for preview so user immediately sees live returns
      const now = Date.now();
      const initialBot: ActiveBot = {
        id: "bot-seed-demo-15d",
        planId: "15d",
        planName: "Quant Arbitrage Engine",
        durationDays: 15,
        dailyRate: 1.7,
        investedAmount: 1000,
        startedAt: now - 3600 * 1000 * 36, // started 1.5 days ago
        expiresAt: now + 3600 * 1000 * (15 * 24 - 36),
        lastClaimAt: now - 3600 * 1000 * 12, // 12h accrued
        claimedProfit: 17.0,
        status: "running",
        executedTradesCount: 48,
      };
      localStorage.setItem(BOTS_STORAGE_KEY, JSON.stringify([initialBot]));
      return [initialBot];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let storeState: AiStoreState = {
  bots: [],
  totalVolume24h: 4892150,
};

let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(BOTS_STORAGE_KEY, JSON.stringify(storeState.bots));
    }
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function initHydration() {
  if (hydrated || typeof localStorage === "undefined") return;
  hydrated = true;
  storeState = {
    ...storeState,
    bots: loadStoredBots(),
  };
  emit();
}

/** Calculate pending (unclaimed) profit for a bot up to the current timestamp */
export function calculatePendingProfit(bot: ActiveBot, now: number = Date.now()): number {
  if (bot.status !== "running") return 0;
  const effectiveEnd = Math.min(now, bot.expiresAt);
  if (effectiveEnd <= bot.lastClaimAt) return 0;

  const secondsElapsed = (effectiveEnd - bot.lastClaimAt) / 1000;
  const dailyProfit = (bot.investedAmount * bot.dailyRate) / 100;
  const profitPerSecond = dailyProfit / 86400;
  return Math.max(0, secondsElapsed * profitPerSecond);
}

/** Total projected profit for the entire duration */
export function calculateTotalProjectedProfit(amount: number, dailyRate: number, days: number): number {
  return (amount * dailyRate * days) / 100;
}

/** Launch a new AI Trading Bot */
export function launchAiBot(planId: string, amount: number): ActiveBot {
  const plan = AI_PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error("Selected plan not found");
  if (amount < plan.minAmount) throw new Error(`Minimum investment for this plan is $${plan.minAmount}`);
  if (amount > plan.maxAmount) throw new Error(`Maximum investment for this plan is $${plan.maxAmount}`);

  const now = Date.now();
  const newBot: ActiveBot = {
    id: `bot-${now}-${Math.random().toString(36).slice(2, 7)}`,
    planId: plan.id,
    planName: plan.name,
    durationDays: plan.durationDays,
    dailyRate: plan.dailyRate,
    investedAmount: amount,
    startedAt: now,
    expiresAt: now + plan.durationDays * 86400 * 1000,
    lastClaimAt: now,
    claimedProfit: 0,
    status: "running",
    executedTradesCount: Math.floor(Math.random() * 8) + 6,
  };

  storeState = {
    ...storeState,
    bots: [newBot, ...storeState.bots],
  };
  emit();
  return newBot;
}

/** Claim accrued profit for an active bot */
export function claimBotProfit(botId: string): number {
  const bot = storeState.bots.find((b) => b.id === botId);
  if (!bot || bot.status !== "running") return 0;

  const now = Date.now();
  const pending = calculatePendingProfit(bot, now);
  if (pending <= 0.01) return 0;

  const isCompleted = now >= bot.expiresAt;

  storeState = {
    ...storeState,
    bots: storeState.bots.map((b) => {
      if (b.id !== botId) return b;
      return {
        ...b,
        claimedProfit: b.claimedProfit + pending,
        lastClaimAt: now,
        status: isCompleted ? "completed" : b.status,
      };
    }),
  };
  emit();
  return pending;
}

/** Stop or complete a bot */
export function stopBot(botId: string): { principal: number; profit: number } {
  const bot = storeState.bots.find((b) => b.id === botId);
  if (!bot) return { principal: 0, profit: 0 };

  const now = Date.now();
  const pending = calculatePendingProfit(bot, now);

  storeState = {
    ...storeState,
    bots: storeState.bots.map((b) => {
      if (b.id !== botId) return b;
      return {
        ...b,
        claimedProfit: b.claimedProfit + pending,
        status: "completed",
      };
    }),
  };
  emit();
  return { principal: bot.investedAmount, profit: pending };
}

/** Hook to access live bots state */
export function useAiTradingStore() {
  initHydration();
  return useSyncExternalStore(
    subscribe,
    () => storeState,
    () => storeState
  );
}

/** Sample live execution trade signals generator */
export function generateLiveTrades(count: number = 8): AiTradeLog[] {
  const PAIRS = [
    { pair: "BTC/USDT", basePrice: 68500 },
    { pair: "ETH/USDT", basePrice: 3450 },
    { pair: "SOL/USDT", basePrice: 182 },
    { pair: "DAFT/USDT", basePrice: 1.84 },
    { pair: "BNB/USDT", basePrice: 590 },
    { pair: "EUR/USD", basePrice: 1.084 },
    { pair: "GBP/USD", basePrice: 1.295 },
  ];

  const STRATEGIES = [
    "Arbitrage Spread",
    "Neural Trend",
    "Volatility Grid",
    "Mean Reversion",
    "Delta Neutral Scalp",
  ];

  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const p = PAIRS[i % PAIRS.length]!;
    const strategy = STRATEGIES[i % STRATEGIES.length]!;
    const side = Math.random() > 0.4 ? ("BUY" as const) : ("SELL" as const);
    const profitPercent = Number((Math.random() * 0.45 + 0.08).toFixed(2));
    const profitUsd = Number((Math.random() * 18 + 4.2).toFixed(2));
    const variance = (Math.random() - 0.5) * 0.005;
    const price = Number((p.basePrice * (1 + variance)).toFixed(p.basePrice < 10 ? 4 : 2));

    return {
      id: `trade-${now - i * 15000}`,
      pair: p.pair,
      side,
      price,
      profitPercent,
      profitUsd,
      strategy,
      timestamp: now - i * 18000,
    };
  });
}
