import { useEffect, useSyncExternalStore } from "react";
import {
  getTrialFundFrozenAmount,
  getTrialFundUsableMargin,
  allocateTrialMargin,
  releaseTrialMargin,
  reclaimTrialFundIfExpired,
  isTrialFundActive,
} from "./trial-fund";

export type DemoPosition = {
  id: string;
  pair: string;
  category: "Crypto" | "Forex";
  side: "LONG" | "SHORT";
  leverage: number;
  /** Margin taken for the position (Frozen in trade). */
  margin: number;
  quote: string;
  symbol: string;
  entryPrice: number;
  liqPrice: number;
  openedAt: number;
  isAiTrade?: boolean;
  planDays?: number;
  dailyRate?: number;
  expiresAt?: number;
  nextProfitAt?: number;
  dailyProfitAmount?: number;
  settledDaysCount?: number;
  lastProfitSettlementAt?: number;
  totalSettledProfit?: number;
  isTrialTrade?: boolean;
  trialMarginAllocated?: number;
};

// Starting available balance for new accounts - strictly $0.00
export const STARTING_TEST_BALANCE = 0;
export type ClosedTrade = DemoPosition & { exitPrice: number; pnl: number; pnlPercent: number; closedAt: number; note?: string };
type State = { balance: number; positions: DemoPosition[]; history: ClosedTrade[]; lastOpenedId: string | null };
const STORAGE_KEY = "vertex-test-account-v2";
const ONE_DAY_MS = 86400 * 1000;

function loadState(): State {
  try {
    if (typeof localStorage === "undefined") throw new Error("no storage");
    // Purge legacy v1 storage key if present
    try { localStorage.removeItem("vertex-test-account-v1"); } catch {}

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const init: State = { balance: STARTING_TEST_BALANCE, positions: [], history: [], lastOpenedId: null };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
      return init;
    }
    const parsed = JSON.parse(raw) as State;
    if (typeof parsed.balance !== "number" || !Array.isArray(parsed.positions) || !Array.isArray(parsed.history)) throw new Error("bad shape");
    // Clear legacy placeholder balances ($10,000 or any starting balance without trades)
    if (parsed.balance === 10_000 || (parsed.balance > 0 && parsed.positions.length === 0 && parsed.history.length === 0)) {
      parsed.balance = 0;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed)); } catch {}
    }
    return { ...parsed, balance: parsed.balance === 10_000 ? 0 : parsed.balance, lastOpenedId: null };
  } catch {
    return { balance: STARTING_TEST_BALANCE, positions: [], history: [], lastOpenedId: null };
  }
}

const DEFAULT_STATE: State = { balance: STARTING_TEST_BALANCE, positions: [], history: [], lastOpenedId: null };
let state: State = loadState();
let hydrated = false;
const listeners = new Set<() => void>();

const emit = () => {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const snapshot = () => state;
const serverSnapshot = () => DEFAULT_STATE;

export function getAvailableBalance(): number {
  return state.balance;
}

/**
 * Frozen balance = Margin locked in open positions + Active unallocated $20 Trial Fund.
 * If user has no open trades and trial fund is active, this equals $20.00!
 */
export function getFrozenBalance(): number {
  const positionsMargin = state.positions.reduce((sum, p) => sum + p.margin, 0);
  const trialFrozen = getTrialFundFrozenAmount();
  return Math.round((positionsMargin + trialFrozen) * 100) / 100;
}

export function getTotalBalance(): number {
  return Math.round((getAvailableBalance() + getFrozenBalance()) * 100) / 100;
}

/**
 * Total purchasing / trading margin available to open manual or AI trades
 * = Available Balance + Usable Trial Fund margin
 */
export function getTradingPower(): number {
  return Math.round((state.balance + getTrialFundUsableMargin()) * 100) / 100;
}

/**
 * 24-hour profit auto-settler & plan tenure maturity handler:
 * 1. Checks every active AI / quantified plan position.
 * 2. Every 24 hours, automatically calculates and credits daily profit into available balance.
 * 3. When the plan's duration/time ends:
 *    - If trial trade: the $20 trial fund is deducted/reclaimed; earned profits stay with user.
 *    - If real trade: original cash principal is returned to available balance.
 */
export function checkAndSettleProfitsAndMaturity(): { settledProfits: number; maturedPositions: number } {
  // Check if trial fund expired (3 days / 72 hours)
  reclaimTrialFundIfExpired();

  let settledProfits = 0;
  let maturedPositions = 0;
  const now = Date.now();

  let hasChanged = false;
  let newBalance = state.balance;
  const remainingPositions: DemoPosition[] = [];
  const newHistoryRecords: ClosedTrade[] = [];

  for (const p of state.positions) {
    if (p.isAiTrade || p.dailyProfitAmount || p.planDays) {
      const planDays = p.planDays || 15;
      const dailyRate = p.dailyRate || (planDays === 25 ? 1.9 : planDays === 30 ? 2.2 : planDays === 60 ? 2.6 : 2.0);
      const dailyProfit = p.dailyProfitAmount || (p.margin * dailyRate) / 100;
      const currentSettled = p.settledDaysCount || 0;

      // How many 24-hour periods have passed since openedAt
      const elapsedMs = Math.max(0, now - p.openedAt);
      const daysPassed = Math.floor(elapsedMs / ONE_DAY_MS);
      const targetSettledDays = Math.min(planDays, daysPassed);
      const unSettledDays = Math.max(0, targetSettledDays - currentSettled);

      const updatedP: DemoPosition = { ...p };

      // Settle 24h profits directly into available balance
      if (unSettledDays > 0) {
        const profitToAdd = Math.round(dailyProfit * unSettledDays * 100) / 100;
        newBalance += profitToAdd;
        settledProfits += profitToAdd;
        updatedP.settledDaysCount = targetSettledDays;
        updatedP.totalSettledProfit = (p.totalSettledProfit || 0) + profitToAdd;
        updatedP.lastProfitSettlementAt = p.openedAt + targetSettledDays * ONE_DAY_MS;
        updatedP.nextProfitAt = updatedP.lastProfitSettlementAt + ONE_DAY_MS;
        hasChanged = true;
      }

      // Check plan maturity: when duration ends
      const expiresAt = p.expiresAt || (p.openedAt + planDays * ONE_DAY_MS);
      if (now >= expiresAt || targetSettledDays >= planDays) {
        const isTrial = p.isTrialTrade || (p.trialMarginAllocated && p.trialMarginAllocated > 0);
        
        if (isTrial) {
          // Trial Trade Matures:
          // The $20 trial fund is deducted/reclaimed automatically after 3 days.
          // All profits accrued remain with the user in available balance!
          if (p.trialMarginAllocated && p.trialMarginAllocated > 0) {
            releaseTrialMargin(p.trialMarginAllocated);
          }
          // If any cash was contributed, return cash only
          const cashPortion = Math.max(0, p.margin - (p.trialMarginAllocated || 0));
          if (cashPortion > 0) {
            newBalance += cashPortion;
          }
        } else {
          // Regular position: Return original invested capital back to available balance
          newBalance += p.margin;
        }

        maturedPositions++;
        hasChanged = true;

        const exitPrice = p.entryPrice;
        const totalProfit = updatedP.totalSettledProfit || dailyProfit * planDays;
        const record: ClosedTrade = {
          ...updatedP,
          exitPrice,
          pnl: totalProfit,
          pnlPercent: p.margin > 0 ? (totalProfit / p.margin) * 100 : 0,
          closedAt: now,
          note: isTrial
            ? `3-day Trial Trade tenure completed. The $20.00 trial principal has been reclaimed. All earned profit (+$${totalProfit.toFixed(2)}) is retained in your available balance.`
            : `Plan tenure of ${planDays} days completed. Principal ($${p.margin.toFixed(2)}) unlocked to available balance.`,
        };
        newHistoryRecords.push(record);
        continue;
      }

      remainingPositions.push(updatedP);
    } else {
      remainingPositions.push(p);
    }
  }

  if (hasChanged) {
    state = {
      ...state,
      balance: Math.round(newBalance * 100) / 100,
      positions: remainingPositions,
      history: [...newHistoryRecords, ...state.history],
    };
    emit();
  }

  return { settledProfits, maturedPositions };
}

function hydrateFromStorage() {
  if (hydrated || typeof localStorage === "undefined") return;
  hydrated = true;
  const persisted = loadState();
  if (persisted !== state && (persisted.balance !== state.balance || persisted.positions.length || persisted.history.length)) {
    state = persisted;
  }
  checkAndSettleProfitsAndMaturity();
  listeners.forEach((l) => l());
}

// Background ticker: checks and settles 24-hour profits and plan completions every 2.5 seconds
if (typeof window !== "undefined") {
  setInterval(() => {
    checkAndSettleProfitsAndMaturity();
  }, 2500);
}

/**
 * Open a trade position.
 * Manual trading strictly requires real deposited cash balance.
 * Automated AI trading can utilize the $20 trial fund for the 3-day auto cycle.
 */
export function openDemoPosition(input: {
  pair: string;
  category: "Crypto" | "Forex";
  side: "Long" | "Short";
  amount: number;
  entryPrice: number;
  symbol: string;
  quote: string;
  leverage?: number;
  isAiTrade?: boolean;
  planDays?: number;
  dailyRate?: number;
  expiresAt?: number;
  nextProfitAt?: number;
  dailyProfitAmount?: number;
  isTrialTrade?: boolean;
}) {
  const leverage = input.symbol === "DAFT" ? input.leverage ?? 1 : 1;
  if (!Number.isFinite(input.amount) || input.amount <= 0 || !Number.isFinite(input.entryPrice) || input.entryPrice <= 0 || ![1, 2, 5, 10, 20, 30].includes(leverage))
    throw new Error("Invalid order");

  const availableCash = state.balance;
  const trialAvailable = getTrialFundUsableMargin();

  let cashToDeduct = 0;
  let trialToAllocate = 0;

  if (!input.isAiTrade) {
    // Manual trading: strictly requires deposited cash. $20 trial fund is forbidden for manual trades.
    if (input.amount > availableCash) {
      if (trialAvailable > 0) {
        throw new Error(
          `The $20 trial fund is restricted strictly to 3-day Auto AI Robot Trading. Manual trading requires deposited funds (${formatMoney(availableCash)} available).`
        );
      }
      throw new Error(`Amount exceeds available balance (${formatMoney(availableCash)}).`);
    }
    cashToDeduct = input.amount;
    trialToAllocate = 0;
  } else {
    // AI Robot Auto Trading: can utilize cash balance and/or $20 trial fund
    const totalTradingPower = Math.round((availableCash + trialAvailable) * 100) / 100;
    if (input.amount > totalTradingPower) {
      throw new Error(`Amount exceeds available trading balance (${formatMoney(totalTradingPower)}).`);
    }

    cashToDeduct = Math.min(availableCash, input.amount);
    trialToAllocate = Math.max(0, Math.round((input.amount - cashToDeduct) * 100) / 100);

    if (trialToAllocate > 0) {
      allocateTrialMargin(trialToAllocate);
    }
  }

  const dir = input.side === "Long" ? 1 : -1;
  const now = Date.now();
  const planDays = input.planDays || 15;
  const expiresAt = input.expiresAt || (now + planDays * ONE_DAY_MS);
  const nextProfitAt = input.nextProfitAt || (now + ONE_DAY_MS);
  const dailyProfitAmount = input.dailyProfitAmount || (input.amount * (input.dailyRate || 2.0)) / 100;

  const position: DemoPosition = {
    id: `pos-${now}-${Math.random().toString(36).slice(2, 7)}`,
    pair: input.pair,
    category: input.category,
    side: input.side === "Long" ? "LONG" : "SHORT",
    leverage,
    margin: input.amount, // Frozen in position
    quote: input.quote,
    symbol: input.symbol,
    entryPrice: input.entryPrice,
    liqPrice: input.entryPrice * (1 - dir / leverage),
    openedAt: now,
    isAiTrade: input.isAiTrade,
    planDays,
    dailyRate: input.dailyRate,
    expiresAt,
    nextProfitAt,
    dailyProfitAmount,
    settledDaysCount: 0,
    lastProfitSettlementAt: now,
    totalSettledProfit: 0,
    isTrialTrade: trialToAllocate > 0 || !!input.isTrialTrade,
    trialMarginAllocated: trialToAllocate,
  };

  // Deduct from available cash balance (if any was used)
  state = {
    ...state,
    balance: Math.max(0, Math.round((state.balance - cashToDeduct) * 100) / 100),
    positions: [position, ...state.positions],
    lastOpenedId: position.id,
  };
  emit();
  return position;
}

/**
 * Close a manual position.
 * If position was funded by trial fund:
 * - Trial fund margin is returned to trial fund.
 * - Any profit made is credited directly into user's available balance!
 * - If loss occurred, user's cash balance is protected from negative balance.
 */
export function closeDemoPosition(id: string, exitPrice: number) {
  const p = state.positions.find((x) => x.id === id);
  if (!p) return;
  if (p.isAiTrade && p.expiresAt && Date.now() < p.expiresAt) {
    throw new Error("AI Trade is locked until plan maturity. Manual closing is disabled.");
  }

  const trialMargin = p.trialMarginAllocated || 0;
  const cashMargin = Math.max(0, p.margin - trialMargin);

  // Release trial margin back
  if (trialMargin > 0) {
    releaseTrialMargin(trialMargin);
  }

  const { pnl, pnlPercent } = positionStats(p, exitPrice);
  const record: ClosedTrade = { ...p, exitPrice, pnl, pnlPercent, closedAt: Date.now() };

  // Calculate return to available balance:
  // If profit: cashMargin + pnl (user keeps all profits!).
  // If loss: cashMargin is reduced by loss, but trial fund absorbs loss beyond cashMargin.
  const netReturn = pnl >= 0 ? cashMargin + pnl : Math.max(0, cashMargin + pnl);

  state = {
    ...state,
    balance: Math.round((state.balance + netReturn) * 100) / 100,
    positions: state.positions.filter((x) => x.id !== id),
    history: [record, ...state.history],
  };
  emit();
}

/** Hook for live account balances: Available ($0.00 start), Frozen ($20.00 trial fund + positions), and Total ($20.00) */
export function useTestAccount() {
  useEffect(hydrateFromStorage, []);
  const current = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const positionsMargin = current.positions.reduce((sum, p) => sum + p.margin, 0);
  const trialFrozen = getTrialFundFrozenAmount();
  const frozenBalance = Math.round((positionsMargin + trialFrozen) * 100) / 100;
  const totalBalance = Math.round((current.balance + frozenBalance) * 100) / 100;
  const usableTrialMargin = getTrialFundUsableMargin();
  const tradingPower = Math.round((current.balance + usableTrialMargin) * 100) / 100;

  return {
    ...current,
    availableBalance: current.balance,
    frozenBalance,
    totalBalance,
    tradingPower,
    usableTrialMargin,
    trialActive: isTrialFundActive(),
  };
}

export function positionStats(p: DemoPosition, currentPrice: number) {
  const dir = p.side === "LONG" ? 1 : -1;
  const qty = p.entryPrice > 0 ? (p.margin * p.leverage) / p.entryPrice : 0;
  const sizeValue = qty * currentPrice;
  const pnl = dir * (currentPrice - p.entryPrice) * qty;
  const pnlPercent = p.margin > 0 ? (pnl / p.margin) * 100 : 0;
  const liqDistance = currentPrice > 0 ? (Math.abs(currentPrice - p.liqPrice) / currentPrice) * 100 : 0;
  return { qty, sizeValue, pnl, pnlPercent, liqDistance };
}

export function formatMoney(value: number, digits = 2) {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

/** Credits an amount to the available balance (e.g. deposit, received transfer, unlocked profit) */
export function creditTestDeposit(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) throw new Error("Invalid deposit amount");
  state = { ...state, balance: Math.round((state.balance + amount) * 100) / 100 };
  emit();
}

/** Deducts an amount from available balance (e.g. for real transfers) */
export function deductAvailableBalance(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid transfer amount");
  if (amount > state.balance) throw new Error("Amount exceeds available balance");
  state = { ...state, balance: Math.round((state.balance - amount) * 100) / 100 };
  emit();
}

/** Credits an incoming transfer to available balance once (idempotent) */
export function creditIncomingTransferOnce(transferId: string, amount: number): boolean {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  try {
    const raw = localStorage.getItem("vx-credited-transfers");
    const set = raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
    if (set.has(transferId)) return false;
    set.add(transferId);
    localStorage.setItem("vx-credited-transfers", JSON.stringify(Array.from(set)));
    creditTestDeposit(amount);
    return true;
  } catch {
    creditTestDeposit(amount);
    return true;
  }
}

/** Resets the local demo account to the starting balance */
export function resetTestAccount() {
  state = { balance: STARTING_TEST_BALANCE, positions: [], history: [], lastOpenedId: null };
  emit();
}
