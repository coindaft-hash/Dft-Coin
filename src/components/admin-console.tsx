import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServerFn } from "@tanstack/react-start";
import { adminRpc } from "@/lib/admin-gate.functions";
import { DEPOSIT_NETWORKS } from "@/lib/deposits";

type Tab = "withdrawals" | "deposits" | "users";
type Stats = { users: number; pending_withdrawals: number; pending_withdrawal_amount: number; pending_deposits: number; total_deposited: number; total_balance: number };
type W = { id: string; user_id: string; email: string | null; network: string; address: string; amount: number; status: string; message: string; created_at: string };
type D = { id: string; user_id: string; email: string | null; network: string; tx_hash: string; expected_amount: number; detected_amount: number | null; status: string; message: string; created_at: string };
type U = { user_id: string; email: string | null; full_name: string | null; created_at: string; last_sign_in_at: string | null; balance: number; invite_code: string | null; team_count: number };

const usd = (n: number) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const when = (s: string | null) => (s ? new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const short = (s: string) => `${s.slice(0, 8)}…${s.slice(-6)}`;
const tone: Record<string, string> = { pending: "text-foreground", review: "text-foreground", confirming: "text-foreground", approved: "text-primary", credited: "text-primary", rejected: "text-destructive", cancelled: "text-muted-foreground", unavailable: "text-muted-foreground" };
const copy = (v: string) => { void navigator.clipboard.writeText(v); toast.success("Copied"); };

export function AdminConsole() {
  const callRpc = useServerFn(adminRpc);
  const rpc = useCallback(async (fn: string, args: Record<string, unknown> = {}) => {
    try { return { data: JSON.parse(await callRpc({ data: { fn: fn as never, args } })) as any, error: null as null | { message: string } }; }
    catch (e) { return { data: null as any, error: { message: e instanceof Error ? e.message : "Failed" } }; }
  }, [callRpc]);
  const [tab, setTab] = useState<Tab>("withdrawals");
  const [filter, setFilter] = useState("pending");
  const [stats, setStats] = useState<Stats | null>(null);
  const [ws, setWs] = useState<W[]>([]);
  const [ds, setDs] = useState<D[]>([]);
  const [us, setUs] = useState<U[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const st = filter === "all" ? null : filter;
    const [s, w, d, u] = await Promise.all([
      rpc("admin_stats"),
      rpc("admin_list_withdrawals", st ? { _status: st } : {}),
      rpc("admin_list_deposits", st && st !== "pending" ? { _status: st } : {}),
      rpc("admin_list_users"),
    ]);
    setLoading(false);
    if (s.error || w.error || d.error || u.error) { toast.error("Admin data unavailable"); return; }
    setStats(s.data as Stats);
    setWs((w.data ?? []) as W[]);
    const deps = (d.data ?? []) as D[];
    setDs(filter === "pending" ? deps.filter(x => ["review", "confirming", "pending"].includes(x.status)) : deps);
    setUs((u.data ?? []) as U[]);
  }, [filter, rpc]);
  useEffect(() => { void load(); }, [load]);

  async function reviewW(id: string, approve: boolean) {
    if (!approve && !confirm("Reject and refund this withdrawal?")) return;
    setBusy(id);
    const { error } = await rpc("admin_review_withdrawal", { _id: id, _approve: approve });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success(approve ? "Withdrawal approved" : "Rejected & refunded"); void load(); }
  }
  async function reviewD(row: D, approve: boolean) {
    let amount: number | undefined;
    if (approve) {
      const v = prompt("Credit amount (USDT)", String(row.detected_amount ?? row.expected_amount));
      if (v === null) return;
      amount = Number(v);
      if (!(amount > 0)) { toast.error("Invalid amount"); return; }
    } else if (!confirm("Reject this deposit?")) return;
    setBusy(row.id);
    const { error } = await rpc("admin_review_deposit", { _id: row.id, _approve: approve, ...(amount ? { _amount: amount } : {}) });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success(approve ? "Balance credited" : "Deposit rejected"); void load(); }
  }

  const needle = q.trim().toLowerCase();
  const match = (...v: (string | null | undefined)[]) => !needle || v.some(x => x?.toLowerCase().includes(needle));
  const users = useMemo(() => us.filter(u => match(u.email, u.full_name, u.invite_code, u.user_id)), [us, needle]);
  const withdrawals = ws.filter(w => match(w.email, w.address));
  const deposits = ds.filter(d => match(d.email, d.tx_hash));

  const tabs: { id: Tab; label: string; count?: number | undefined }[] = [
    { id: "withdrawals", label: "Withdrawals", count: stats?.pending_withdrawals },
    { id: "deposits", label: "Recharge", count: stats?.pending_deposits },
    { id: "users", label: "Users", count: stats?.users },
  ];

  return (
    <section className="space-y-5">
      <Toaster />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          ["Total users", String(stats?.users ?? "—")],
          ["Pending withdrawals", stats ? `${stats.pending_withdrawals} · ${usd(stats.pending_withdrawal_amount)}` : "—"],
          ["Pending recharge", String(stats?.pending_deposits ?? "—")],
          ["Total recharged", stats ? usd(stats.total_deposited) : "—"],
          ["User balances", stats ? usd(stats.total_balance) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</p>
            <p className="mt-1 text-base font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 rounded-xl border border-border bg-card p-1" role="tablist">
        {tabs.map(t => (
          <Button key={t.id} role="tab" aria-selected={tab === t.id} variant={tab === t.id ? "default" : "ghost"} size="sm" className="flex-1" onClick={() => setTab(t.id)}>
            {t.label}{t.count ? <span className="ml-1 rounded-full bg-background/30 px-1.5 text-[10px]">{t.count}</span> : null}
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={q} onChange={e => setQ(e.target.value)} placeholder="Search email, address, TXID" aria-label="Search" />
        </div>
        {tab !== "users" && (
          <select className="rounded-md border border-border bg-card px-2 text-sm" value={filter} onChange={e => setFilter(e.target.value)} aria-label="Status filter">
            <option value="pending">Pending</option>
            <option value={tab === "deposits" ? "credited" : "approved"}>{tab === "deposits" ? "Credited" : "Approved"}</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        )}
        <Button variant="outline" size="icon" aria-label="Refresh" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} /></Button>
      </div>

      {tab === "withdrawals" && (
        <ul className="space-y-2">
          {withdrawals.length === 0 && <Empty />}
          {withdrawals.map(w => (
            <li key={w.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{w.email ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{w.network.toUpperCase()} · {when(w.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{usd(w.amount)}</p>
                  <p className={`text-xs capitalize ${tone[w.status] ?? ""}`}>{w.status}</p>
                </div>
              </div>
              <button type="button" onClick={() => copy(w.address)} className="mt-2 flex w-full items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-left font-mono text-xs">
                <span className="truncate">{w.address}</span><Copy className="ml-auto size-3.5 shrink-0" />
              </button>
              {w.status === "pending" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" disabled={busy === w.id} onClick={() => void reviewW(w.id, false)}><X className="size-4" />Reject</Button>
                  <Button size="sm" disabled={busy === w.id} onClick={() => void reviewW(w.id, true)}><Check className="size-4" />Mark paid</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {tab === "deposits" && (
        <ul className="space-y-2">
          {deposits.length === 0 && <Empty />}
          {deposits.map(d => {
            const net = DEPOSIT_NETWORKS[d.network as keyof typeof DEPOSIT_NETWORKS];
            return (
              <li key={d.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.email ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{d.network.toUpperCase()} · {when(d.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{d.detected_amount != null ? usd(d.detected_amount) : "—"}</p>
                    <p className="text-[11px] text-muted-foreground">claimed {usd(d.expected_amount)}</p>
                    <p className={`text-xs capitalize ${tone[d.status] ?? ""}`}>{d.status}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5 font-mono text-xs">
                  <span className="truncate">{short(d.tx_hash)}</span>
                  <button type="button" aria-label="Copy TXID" className="ml-auto" onClick={() => copy(d.tx_hash)}><Copy className="size-3.5" /></button>
                  {net && /^0x[0-9a-fA-F]{64}$/.test(d.tx_hash) && <a className="text-primary underline" target="_blank" rel="noreferrer" href={`${net.explorer}${d.tx_hash}`}>View</a>}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{d.message}</p>
                {!["credited", "rejected"].includes(d.status) && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" disabled={busy === d.id} onClick={() => void reviewD(d, false)}><X className="size-4" />Reject</Button>
                    <Button size="sm" disabled={busy === d.id} onClick={() => void reviewD(d, true)}><Check className="size-4" />Approve & credit</Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {tab === "users" && (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {users.length === 0 && <Empty />}
          {users.map(u => (
            <li key={u.user_id} className="flex items-center gap-3 p-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {(u.full_name?.trim() || u.email || "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.full_name?.trim() || "—"}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                <p className="text-[11px] text-muted-foreground">Code {u.invite_code ?? "—"} · Team {u.team_count} · Joined {when(u.created_at)}</p>
              </div>
              <p className="font-semibold tabular-nums">{usd(u.balance)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Empty() {
  return <p className="p-6 text-center text-sm text-muted-foreground">Nothing here</p>;
}
