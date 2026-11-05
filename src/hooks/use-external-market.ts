import { useEffect, useSyncExternalStore } from "react";
import type { Socket } from "socket.io-client";
import { MARKET_SERVER_URL, parseCoins, type ExternalCoin } from "@/lib/external-market";

type State = { coins: Record<string, ExternalCoin>; connected: boolean; loading: boolean; error: string; now: number };
const initial: State = { coins: {}, connected: false, loading: true, error: "", now: 0 };
let state = initial;
const listeners = new Set<() => void>();
const emit = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };
let users = 0;
let cleanup: (() => void) | undefined;
function start() {
  let active = true;
  let socket: Socket | undefined;
  let sequence = 0;
  const abort = new AbortController();
  const merge = (payload: unknown, replace = false) => {
    const coins = parseCoins(payload);
    const next = replace ? {} : { ...state.coins };
    for (const c of coins) { const previous = next[c.symbol]; if (!previous || c.updatedAt >= previous.updatedAt) next[c.symbol] = c; }
    emit({ coins: next, loading: false, error: "", now: Date.now() });
  };
  async function load() {
    const current = sequence;
    try {
      const response = await fetch(`${MARKET_SERVER_URL}/api/coins`, { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(10_000)]) });
      if (!response.ok) throw new Error(`Coin list: HTTP ${response.status}`);
      const body: unknown = await response.json();
      if (active) merge(body, current === sequence);
    } catch (e) { if (active) emit({ loading: false, error: e instanceof Error ? e.message : "Coin list unavailable" }); }
  }
  void load();
  void import("socket.io-client").then(({ io }) => {
    if (!active) return;
    socket = io(MARKET_SERVER_URL, { reconnection: true, reconnectionDelay: 1000, reconnectionDelayMax: 15_000, timeout: 10_000 });
    socket.on("connect", () => { emit({ connected: true, error: "" }); void load(); });
    socket.on("disconnect", () => emit({ connected: false, error: "Market connection lost" }));
    socket.on("connect_error", (e: Error) => emit({ connected: false, loading: false, error: `Market connection: ${e.message}` }));
    socket.on("marketUpdate", (body: unknown) => {
      sequence++;
      try { merge(body); } catch { emit({ error: "Invalid marketUpdate payload; last valid prices retained" }); }
    });
  }).catch(() => { if (active) emit({ loading: false, error: "Market connection unavailable" }); });
  const tick = setInterval(() => emit({ now: Date.now() }), 5000);
  const retry = setInterval(() => { if (!socket?.connected) void load(); }, 30_000);
  cleanup = () => { active = false; abort.abort(); socket?.disconnect(); clearInterval(tick); clearInterval(retry); };
}
export function useExternalMarket() {
  const value = useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, () => state, () => initial);
  useEffect(() => { if (users++ === 0) start(); return () => { if (--users === 0) cleanup?.(); }; }, []);
  return value;
}
