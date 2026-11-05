import { useEffect, useState, useSyncExternalStore } from "react";
import { openDemoPosition, creditTestDeposit } from "./demo-positions";

export const TRIAL_FUND_AMOUNT = 20;
export const TRIAL_DURATION_DAYS = 3;
export const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000; // 72 Hours
export const TRIAL_DAILY_RATE = 2.0; // 2.0% daily return = $0.40 / day

export interface TrialFundState {
  amount: number;
  activatedAt: number;
  expiresAt: number;
  claimed: boolean;
  expiredReclaimed: boolean;
  allocatedMargin: number;
  tradeActive: boolean;
  tradeStartedAt?: number;
  lastSettlementAt?: number;
  settledDays: number;
  totalEarnedProfit: number;
  modalDismissed: boolean;
}

const STORAGE_KEY = "vx-trial-fund-v3";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function createDefaultTrialFund(): TrialFundState {
  const now = Date.now();
  return {
    amount: TRIAL_FUND_AMOUNT,
    activatedAt: now,
    expiresAt: now + TRIAL_DURATION_MS,
    claimed: true, // Welcome trial fund is immediately active in frozen balance
    expiredReclaimed: false,
    allocatedMargin: 0,
    tradeActive: false,
    settledDays: 0,
    totalEarnedProfit: 0,
    modalDismissed: false,
  };
}

function loadTrialFund(): TrialFundState {
  try {
    if (typeof localStorage === "undefined") return createDefaultTrialFund();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = createDefaultTrialFund();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.amount !== "number" || typeof parsed.expiresAt !== "number") {
      const fresh = createDefaultTrialFund();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }

    // Auto-check 3-day maturity on load
    const now = Date.now();
    if (now >= parsed.expiresAt && !parsed.expiredReclaimed) {
      parsed.expiredReclaimed = true;
      parsed.amount = 0;
      parsed.allocatedMargin = 0;
      parsed.tradeActive = false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }

    return parsed as TrialFundState;
  } catch {
    return createDefaultTrialFund();
  }
}

let currentTrialFund: TrialFundState = loadTrialFund();
const listeners = new Set<() => void>();

function emit() {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentTrialFund));
    }
  } catch {}
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const getSnapshot = () => currentTrialFund;

/**
 * Returns whether the trial fund is still unexpired and active.
 */
export function isTrialFundActive(): boolean {
  if (currentTrialFund.expiredReclaimed) return false;
  if (Date.now() >= currentTrialFund.expiresAt) {
    reclaimTrialFundIfExpired();
    return false;
  }
  return currentTrialFund.claimed && currentTrialFund.amount > 0;
}

/**
 * Returns the unallocated trial fund portion that sits in Frozen Balance.
 * When positions take margin from the trial fund, this returns (amount - allocatedMargin).
 */
export function getTrialFundFrozenAmount(): number {
  if (!isTrialFundActive()) return 0;
  return Math.max(0, currentTrialFund.amount - currentTrialFund.allocatedMargin);
}

/**
 * Returns how much trial fund margin is available to place new trades (Manual or AI).
 */
export function getTrialFundUsableMargin(): number {
  if (!isTrialFundActive()) return 0;
  return Math.max(0, currentTrialFund.amount - currentTrialFund.allocatedMargin);
}

/**
 * Allocates a margin amount from the trial fund for an open trade.
 */
export function allocateTrialMargin(amount: number): boolean {
  if (!isTrialFundActive() || amount <= 0) return false;
  const available = getTrialFundUsableMargin();
  if (amount > available) return false;
  currentTrialFund = {
    ...currentTrialFund,
    allocatedMargin: Math.min(currentTrialFund.amount, currentTrialFund.allocatedMargin + amount),
  };
  emit();
  return true;
}

/**
 * Releases allocated margin back to the unallocated trial fund.
 */
export function releaseTrialMargin(amount: number): void {
  if (amount <= 0) return;
  currentTrialFund = {
    ...currentTrialFund,
    allocatedMargin: Math.max(0, currentTrialFund.allocatedMargin - amount),
  };
  emit();
}

/**
 * Reclaims the $20 trial fund when 3 days (72 hours) have elapsed.
 * Any earned profits remain untouched in the user's available balance.
 */
export function reclaimTrialFundIfExpired(): boolean {
  if (currentTrialFund.expiredReclaimed) return false;
  const now = Date.now();
  if (now >= currentTrialFund.expiresAt) {
    // Settle any remaining unsettled daily profits before closing
    checkAndSettleTrialProfit();

    currentTrialFund = {
      ...currentTrialFund,
      expiredReclaimed: true,
      amount: 0,
      allocatedMargin: 0,
      tradeActive: false,
    };
    emit();
    return true;
  }
  return false;
}

/**
 * Check and settle any 24h profits from the trial fund trade.
 * Profit is credited directly to available balance.
 */
export function checkAndSettleTrialProfit(): void {
  // Check maturity first
  if (Date.now() >= currentTrialFund.expiresAt && !currentTrialFund.expiredReclaimed) {
    reclaimTrialFundIfExpired();
    return;
  }

  if (!currentTrialFund.tradeActive || !currentTrialFund.tradeStartedAt) return;
  const now = Date.now();
  const elapsed = Math.max(0, now - currentTrialFund.tradeStartedAt);
  const totalDays = Math.min(TRIAL_DURATION_DAYS, Math.floor(elapsed / ONE_DAY_MS));
  const unSettled = Math.max(0, totalDays - currentTrialFund.settledDays);

  if (unSettled > 0) {
    const dailyProfit = (TRIAL_FUND_AMOUNT * TRIAL_DAILY_RATE) / 100; // $0.40 per day
    const addedProfit = Math.round(dailyProfit * unSettled * 100) / 100;

    // Credit profit into wallet available balance
    try {
      creditTestDeposit(addedProfit);
    } catch {}

    currentTrialFund = {
      ...currentTrialFund,
      settledDays: totalDays,
      totalEarnedProfit: Math.round((currentTrialFund.totalEarnedProfit + addedProfit) * 100) / 100,
      lastSettlementAt: now,
    };
    emit();
  }
}

// Background profit & maturity checker every 3 seconds
if (typeof window !== "undefined") {
  setInterval(() => {
    checkAndSettleTrialProfit();
    reclaimTrialFundIfExpired();
  }, 3000);
}

export function claimTrialFund(): TrialFundState {
  currentTrialFund = {
    ...currentTrialFund,
    claimed: true,
  };
  emit();
  return currentTrialFund;
}

export function startTrialTrade(): TrialFundState {
  const now = Date.now();
  
  // Allocate full trial fund for the 3-day AI Trade
  allocateTrialMargin(TRIAL_FUND_AMOUNT);

  currentTrialFund = {
    ...currentTrialFund,
    claimed: true,
    tradeActive: true,
    tradeStartedAt: now,
    lastSettlementAt: now,
  };

  // Register position for visual tracking in trade history and positions list
  try {
    openDemoPosition({
      pair: "DAFT/USDT",
      category: "Crypto",
      side: "Long",
      amount: TRIAL_FUND_AMOUNT,
      entryPrice: 1.8425,
      symbol: "DAFT",
      quote: "USDT",
      leverage: 1,
      isAiTrade: true,
      planDays: 3,
      dailyRate: TRIAL_DAILY_RATE,
      expiresAt: now + TRIAL_DURATION_MS,
      dailyProfitAmount: (TRIAL_FUND_AMOUNT * TRIAL_DAILY_RATE) / 100,
      isTrialTrade: true,
    });
  } catch {}

  emit();
  return currentTrialFund;
}

export function dismissTrialModal(): void {
  currentTrialFund = {
    ...currentTrialFund,
    modalDismissed: true,
  };
  emit();
}

export function reopenTrialModal(): void {
  currentTrialFund = {
    ...currentTrialFund,
    modalDismissed: false,
  };
  emit();
}

export function resetTrialFundForNewUser(): TrialFundState {
  const fresh = createDefaultTrialFund();
  currentTrialFund = fresh;
  emit();
  return fresh;
}

export function useTrialFund() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => currentTrialFund);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      reclaimTrialFundIfExpired();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isExpired = state.expiredReclaimed || now >= state.expiresAt;
  const remainingMs = Math.max(0, state.expiresAt - now);
  const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const remainingSeconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

  const formattedCountdown = `${String(remainingHours).padStart(2, "0")}h : ${String(remainingMinutes).padStart(2, "0")}m : ${String(remainingSeconds).padStart(2, "0")}s`;

  return {
    ...state,
    isExpired,
    remainingMs,
    remainingHours,
    remainingMinutes,
    remainingSeconds,
    formattedCountdown,
    usableMargin: getTrialFundUsableMargin(),
    frozenTrialAmount: getTrialFundFrozenAmount(),
    claim: claimTrialFund,
    startTrade: startTrialTrade,
    dismissModal: dismissTrialModal,
    openModal: reopenTrialModal,
  };
}
