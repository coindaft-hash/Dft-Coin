import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Gift, ListChecks, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorNote, LoadingRows, ProfileShell, SignInSection, dayTime, money, signedMoney } from "@/components/profile-shell";
import { RECORD_TABS, type RecordTab } from "@/lib/record-tabs";
import { DEPOSIT_NETWORKS, type DepositNetwork } from "@/lib/deposits";
import { useAccount } from "@/hooks/use-account";
import { supabase } from "@/integrations/supabase/client";

/** Loose shape shared by every record table so one renderer can handle all tabs. */
type AnyRow = {
  id?: string;
  network?: string;
  tx_hash?: string;
  expected_amount?: number | string;
  status?: string;
  created_at?: string;
  address?: string;
  amount?: number | string;
  sender_id?: string;
  recipient_id?: string;
  sender_email?: string;
  recipient_email?: string;
  note?: string;
  kind?: string;
};

const KIND_LABEL: Record<string, string> = {
  opening_balance: "Starting balance",
  transfer_in: "Received",
  transfer_out: "Sent",
  referral_bonus: "Referral bonus",
  deposit_credit: "Deposit credited",
  withdrawal: "Withdrawal",
  withdrawal_refund: "Withdrawal refunded",
  adjustment: "Adjustment",
};

const depositLabel: Record<string, string> = {
  pending: "Awaiting transaction",
  confirming: "Confirming on network",
  review: "Verified · review required",
  credited: "Credited to balance",
  rejected: "Payment not verified",
  unavailable: "Verification unavailable",
};

const emptyIcon = { deposits: ArrowDownLeft, withdrawals: ArrowUpRight, transfers: ArrowDownLeft, rewards: Gift, funds: ListChecks } as const;

export function RecordsPage({ tab }: { tab: RecordTab }) {
  const { account, checked } = useAccount();
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    const query =
      tab === "deposits"
        ? supabase.from("deposit_submissions").select("*").order("created_at", { ascending: false }).limit(50)
        : tab === "withdrawals"
          ? supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).limit(50)
          : tab === "transfers"
            ? supabase.from("wallet_transfers").select("*").order("created_at", { ascending: false }).limit(50)
            : tab === "rewards"
              ? supabase.from("wallet_ledger").select("*").eq("kind", "referral_bonus").order("created_at", { ascending: false }).limit(50)
              : supabase.from("wallet_ledger").select("*").order("created_at", { ascending: false }).limit(100);
    const { data, error } = await query;
    if (error) {
      setState("error");
      return;
    }
    setRows((data ?? []) as unknown as AnyRow[]);
    setState("ready");
  }, [tab]);

  useEffect(() => {
    if (account) void load();
  }, [account?.id, load]);

  async function cancel(id: string) {
    setBusy(true);
    const { error } = await supabase.rpc("cancel_withdrawal", { _id: id });
    setBusy(false);
    if (error) {
      setState("error");
      return;
    }
    void load();
  }

  function render(row: AnyRow) {
    if (tab === "deposits") {
      const network = (row.network ?? "bsc") as DepositNetwork;
      const hash = row.tx_hash ?? "";
      const status = row.status ?? "";
      return (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tabular-nums">
            {money(Number(row.expected_amount ?? 0))} USDT
            <span className="ml-1 text-[10px] font-normal text-muted-foreground">{DEPOSIT_NETWORKS[network]?.label ?? ""}</span>
          </p>
          <p className={`truncate text-[10px] ${status === "rejected" ? "text-destructive" : "text-muted-foreground"}`}>
            {depositLabel[status] ?? status} · {dayTime(row.created_at ?? "")}
          </p>
          {hash && (
            <a
              className="inline-flex items-center gap-1 truncate text-[10px] text-muted-foreground underline-offset-2 hover:underline"
              href={`${DEPOSIT_NETWORKS[network]?.explorer ?? ""}${hash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {hash.slice(0, 10)}…{hash.slice(-6)}
            </a>
          )}
        </div>
      );
    }

    if (tab === "withdrawals") {
      const network = (row.network ?? "bsc") as DepositNetwork;
      const status = row.status ?? "";
      const address = row.address ?? "";
      return (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tabular-nums">{money(Number(row.amount ?? 0))} USDT</p>
            <p className="truncate font-mono text-[10px] text-muted-foreground">
              {DEPOSIT_NETWORKS[network]?.label ?? row.network} · {address.slice(0, 8)}…{address.slice(-6)}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              <span className="capitalize">{status}</span> · {dayTime(row.created_at ?? "")}
            </p>
          </div>
          {status === "pending" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 text-destructive"
              disabled={busy}
              onClick={() => void cancel(row.id ?? "")}
            >
              <XCircle className="size-3.5" />
              Cancel
            </Button>
          )}
        </div>
      );
    }

    if (tab === "transfers") {
      const out = row.sender_id === account?.id;
      return (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{out ? `To ${row.recipient_email}` : `From ${row.sender_email}`}</p>
            <p className="truncate text-[10px] text-muted-foreground">
              {dayTime(row.created_at ?? "")}
              {row.note ? ` · ${row.note}` : ""}
            </p>
          </div>
          <span className={`shrink-0 text-sm font-semibold tabular-nums ${out ? "text-destructive" : "text-primary"}`}>
            {out ? "−" : "+"}
            {money(Number(row.amount ?? 0))}
          </span>
        </div>
      );
    }

    const amount = Number(row.amount ?? 0);
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{KIND_LABEL[row.kind ?? ""] ?? row.kind}</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {row.note} · {dayTime(row.created_at ?? "")}
          </p>
        </div>
        <span className={`shrink-0 text-sm font-semibold tabular-nums ${amount >= 0 ? "text-primary" : "text-destructive"}`}>
          {signedMoney(amount)}
        </span>
      </div>
    );
  }

  return (
    <ProfileShell title="Records" back="/profile">
      <div className="mt-5 flex gap-1 overflow-x-auto rounded-lg bg-secondary p-1" role="tablist" aria-label="Record type">
        {RECORD_TABS.map(item => (
          <Button
            key={item.id}
            asChild
            variant="ghost"
            size="sm"
            className="shrink-0 text-[11px]"
            data-active={item.id === tab}
            aria-current={item.id === tab ? "page" : undefined}
          >
            <Link to="/records" search={{ tab: item.id }}>
              {item.label}
            </Link>
          </Button>
        ))}
      </div>

      {!checked ? (
        <LoadingRows rows={4} label="Loading records" />
      ) : !account ? (
        <SignInSection note="Sign in to see your deposit, withdrawal and transfer records." />
      ) : state === "loading" ? (
        <LoadingRows rows={4} label="Loading records" />
      ) : state === "error" ? (
        <div className="pt-5">
          <ErrorNote message="These records could not be loaded. Please retry." onRetry={() => void load()} />
        </div>
      ) : rows.length === 0 ? (
        <div className="pt-5">
          <EmptyState
            icon={emptyIcon[tab]}
            title={`No ${RECORD_TABS.find(t => t.id === tab)?.label.toLowerCase() ?? "records"} yet`}
            note="Anything that happens on this account will be listed here with its date and amount."
          />
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {rows.map((row, i) => (
            <li key={row.id ?? `${tab}-${i}`} className="rounded-xl border border-border bg-card p-3">
              {render(row)}
            </li>
          ))}
        </ul>
      )}
    </ProfileShell>
  );
}
