import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Copy,
  Crown,
  Eye,
  EyeOff,
  LogOut,
  Pencil,
  Plus,
  Share2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  ArrowCircleDown, ArrowCircleUp, ArrowsLeftRight,
  Gift as GiftIcon, ClipboardText, Crown as CrownIcon,
  Wallet, Question, GearSix, Headset, ShieldCheck as ShieldCheckIcon, type Icon as ProfileIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingRows, ProfileShell, SignInSection, money } from "@/components/profile-shell";
import { useAccount } from "@/hooks/use-account";
import { useTestAccount } from "@/lib/demo-positions";
import { type RecordTab } from "@/lib/record-tabs";
import { tierFor } from "@/lib/vip-tiers";
import { supabase, purgeAllRegisteredAccounts } from "@/integrations/supabase/client";
import { useTrialFund } from "@/lib/trial-fund";
import { TrialFundModal } from "@/components/trial-fund-modal";
import { getProfileSummaryForUser } from "@/lib/referral-team";
import aiRobot from "@/assets/ai-robot.png";

type Summary = {
  balance: number;
  earnings: number;
  deposited: number;
  withdrawn: number;
  team_count: number;
  deposit_count: number;
  withdrawal_count: number;
  transfer_count: number;
};

const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0));

const commonTools = [
  { name: "Deposit", icon: Plus, to: "/deposit" as const, primary: true },
  { name: "Withdraw", icon: ArrowUpRight, to: "/withdraw" as const, primary: false },
  { name: "My Team", icon: Users, to: "/team" as const, primary: false },
  { name: "Referral", icon: Share2, to: "/referral" as const, primary: false },
];

const implementsTools: (
   | { name: string; icon: ProfileIcon; to: string; tone: string; tab?: never }
   | { name: string; icon: ProfileIcon; to: "/records"; tone: string; tab: RecordTab }
)[] = [
  { name: "Deposit history", icon: ArrowCircleDown, to: "/records", tab: "deposits", tone: "income" },
  { name: "Withdrawal history", icon: ArrowCircleUp, to: "/records", tab: "withdrawals", tone: "payment" },
  { name: "Transfer history", icon: ArrowsLeftRight, to: "/records", tab: "transfers", tone: "community" },
  { name: "Referral rewards", icon: GiftIcon, to: "/records", tab: "rewards", tone: "reward" },
  { name: "Account statement", icon: ClipboardText, to: "/records", tab: "funds", tone: "support" },
  { name: "VIP status", icon: CrownIcon, to: "/vip", tone: "reward" },
  { name: "Wallet settings", icon: Wallet, to: "/wallet-management", tone: "account" },
  { name: "FAQ", icon: Question, to: "/faq", tone: "community" },
  { name: "Settings", icon: GearSix, to: "/settings", tone: "account" },
  { name: "Support", icon: Headset, to: "/support", tone: "support" },
  { name: "Admin Panel (এডমিন)", icon: ShieldCheckIcon, to: "/admin", tone: "reward" },
];

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="mb-4 text-lg font-bold text-foreground">
      {children}
    </h2>
  );
}

function ToolTile({
  name,
  icon: Icon,
  to,
  search,
  tone,
  compact = false,
}: {
  name: string;
  icon: ProfileIcon;
  to: string;
  tone: string;
  compact?: boolean;
  search?: { tab: RecordTab } | undefined;
}) {
  return (
    <Button asChild variant="ghost" className={`profile-tool h-auto min-w-0 rounded-lg ${compact ? "profile-tool-compact min-h-20 p-3" : "min-h-24 p-2"}`} >
    <Link
      to={to}
      {...(search ? { search } : {})}
      data-tone={tone}
       className={`group flex ${compact ? "flex-row justify-start gap-3 text-left" : "flex-col items-center justify-center gap-2 text-center"}`}
      aria-label={name}
    >
       <span className="profile-tool-icon grid size-10 shrink-0 place-items-center rounded-lg">
         <Icon weight="duotone" className="!size-6" aria-hidden />
      </span>
      <span className="profile-tool-label w-full whitespace-normal text-foreground">{name}</span>
       {compact && <ChevronRight className="!size-3 shrink-0 text-muted-foreground" aria-hidden />}
    </Link>
    </Button>
  );
}

export function ProfilePage() {
  const { account, checked, reload } = useAccount();
  const navigate = useNavigate();
  const { availableBalance, frozenBalance, totalBalance } = useTestAccount();
  const trial = useTrialFund();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [todayEarnings, setTodayEarnings] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "" });
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    setError("");
    const local = getProfileSummaryForUser(account);
    try {
      await supabase.rpc("ensure_my_wallet");
      const { data, error: err } = await supabase.rpc("profile_summary");
      if (!err && data) {
        const row = data as Record<string, unknown>;
        setSummary({
          balance: availableBalance,
          earnings: num(row["earnings"] ?? local.earnings),
          deposited: num(row["deposited"] ?? 0),
          withdrawn: num(row["withdrawn"] ?? 0),
          team_count: num(row["team_count"] ?? local.team_count),
          deposit_count: num(row["deposit_count"] ?? 0),
          withdrawal_count: num(row["withdrawal_count"] ?? 0),
          transfer_count: num(row["transfer_count"] ?? 0),
        });
        setTodayEarnings(local.earnings);
        return;
      }
    } catch {
      // Supabase unavailable or local session
    }

    setSummary(local);
    setTodayEarnings(0);
  }, [account, availableBalance]);

  useEffect(() => {
    if (account) void load();
  }, [account?.id, load]);

  useEffect(() => {
    if (account) setForm({ firstName: account.firstName, lastName: account.lastName });
  }, [account?.id]);

  const tier = tierFor(availableBalance);
  const [wholeBalance, balanceCents] = (summary?.balance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split(".");

  async function copyId() {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy unavailable. Select the ID and copy it manually.");
    }
  }

  async function saveProfile() {
    setSaving(true);
    const first = form.firstName.trim();
    const last = form.lastName.trim();
    const { error: err } = await supabase.auth.updateUser({
      data: { first_name: first, last_name: last, full_name: [first, last].filter(Boolean).join(" ") },
    });
    setSaving(false);
    if (err) {
      setError("Profile could not be saved. Please try again.");
      return;
    }
    await reload();
    setEditOpen(false);
    toast.success("Profile updated");
  }

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    purgeAllRegisteredAccounts();
    setSigningOut(false);
    setLogoutOpen(false);
    void navigate({ to: "/register" });
  }

  if (!checked)
    return (
      <ProfileShell title="Profile">
        <LoadingRows rows={4} label="Loading profile" />
      </ProfileShell>
    );

  if (!account)
    return (
      <ProfileShell title="Profile">
        <SignInSection note="Sign in to see your profile, balance and records." />
      </ProfileShell>
    );

  return (
    <ProfileShell title="Profile">
      {error && (
        <div className="pt-4">
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        </div>
      )}

      {/* Hero: avatar, name, ID, tier */}
      <section className="py-6">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <div className="grid size-14 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-xl font-semibold text-primary">
            {account.initials}
          </div>
          <div className="min-w-0 pt-1">
            <h2 className="truncate text-lg font-bold leading-tight">{account.fullName}</h2>
            <Button variant="ghost"
              type="button"
              onClick={() => void copyId()}
              className="mt-1 h-6 gap-1.5 p-0 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
              aria-label={copied ? "User ID copied" : "Copy user ID"}
            >
              ID: {account.id.slice(0, 8)}
              {copied ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
            </Button>
            <span className="ml-3 inline-flex items-center gap-1 text-[11px] font-medium text-tool-reward">
              <Crown className="size-3" />
              {tier.current.name} VIP
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 rounded-lg border border-border text-muted-foreground"
            onClick={() => {
              setForm({ firstName: account.firstName, lastName: account.lastName });
              setEditOpen(true);
            }}
            aria-label="Edit profile"
          >
            <Pencil className="size-4" />
          </Button>
        </div>
      </section>

      {/* Balance / Total Earnings */}
      <section className="grid grid-cols-2 gap-3" aria-label="Account overview">
        <div className="balance-card col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Total balance</span>
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" aria-label={balanceVisible ? "Hide balance" : "Show balance"} onClick={() => setBalanceVisible(!balanceVisible)}>
                {balanceVisible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              </Button>
            </div>
            <span className="text-[10px] text-muted-foreground">USD</span>
          </div>
          <p className="balance-number break-all">{balanceVisible ? money(totalBalance) : "$••,•••.••"}</p>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
            <span>Available: <strong className="text-foreground font-mono">{balanceVisible ? money(availableBalance) : "•••"}</strong></span>
            <span>Frozen in trade: <strong className="text-amber-400 font-mono">{balanceVisible ? money(frozenBalance) : "•••"}</strong></span>
          </div>
        </div>
        <div className="min-w-0 rounded-lg border border-border bg-card px-4 py-4">
          <p className="text-xs text-muted-foreground">
             Today's earnings
          </p>
          <p className="mt-2 break-all text-xl font-semibold tabular-nums text-primary">
            {balanceVisible ? todayEarnings === null ? "—" : money(todayEarnings) : "$•••.••"}
          </p>
        </div>
        <div className="min-w-0 rounded-lg border border-border bg-card px-4 py-4">
          <p className="text-xs text-muted-foreground">
             Total earnings
          </p>
          {summary ? (
            <p className="mt-2 break-all text-xl font-semibold tabular-nums">{balanceVisible ? money(summary.earnings) : "$•••.••"}</p>
          ) : (
            <div className="mx-auto mt-2 h-8 w-24 animate-pulse rounded-lg bg-secondary" />
          )}
        </div>
      </section>

      {!trial.isExpired && (
        <section className="mt-4">
          <TrialFundModal />
          <button
            type="button"
            onClick={trial.openModal}
            className="w-full rounded-2xl bg-gradient-to-r from-[#14263f] via-[#0e1d32] to-[#14263f] border border-emerald-500/35 p-3.5 text-left flex items-center justify-between gap-3 shadow-lg shadow-black/30 hover:border-emerald-400 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="relative size-10 shrink-0 rounded-xl bg-emerald-500/15 border border-emerald-500/40 p-1 flex items-center justify-center">
                <img src={aiRobot} alt="Robot" className="size-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <span>$20.00 Welcome AI Trial Fund</span>
                  <span className="text-[10px] text-emerald-400 font-mono">({trial.remainingHours}h left)</span>
                </div>
                <div className="text-[11px] text-emerald-300/80">
                  {trial.tradeActive ? "● AI Robot is Trading Now · Tap to view" : "Risk-Free 3-Day AI Trading · Tap to claim"}
                </div>
              </div>
            </div>
            <ChevronRight className="size-4 text-emerald-400 shrink-0" />
          </button>
        </section>
      )}

      {/* Common Tools */}
      <section className="mt-6">
        <SectionTitle>Quick actions</SectionTitle>
          <div className="quick-actions" aria-label="Account actions">
            {commonTools.map(({ name, icon: Icon, to, primary }) => (
              <div className="quick-action" key={name}>
                <Button asChild variant={primary ? "default" : "secondary"} size="icon" className="action-icon" title={name}>
                  <Link to={to} aria-label={name}><Icon className="size-5" strokeWidth={1.8} /></Link>
                </Button>
                <span>{name}</span>
              </div>
          ))}
        </div>
      </section>

      {/* My Implements */}
      {[
        { title: "Activity & records", tools: implementsTools.filter(tool => tool.tab) },
        { title: "Account & support", tools: implementsTools.filter(tool => !tool.tab) },
      ].map(section => (
        <section key={section.title} className="mt-6">
          <SectionTitle>{section.title}</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {section.tools.map(({ name, icon: Icon, to, tab, tone }) => (
              <ToolTile key={name} compact name={name} icon={Icon} to={to} tone={tone} search={tab ? { tab } : undefined} />
            ))}
          </div>
        </section>
      ))}

      {/* Record counts */}
      <section className="mt-5 border-t border-border pt-4">
        <p className="text-[11px] leading-5 text-muted-foreground">
          {summary
            ? `${summary.deposit_count} deposit submissions · ${summary.withdrawal_count} withdrawal requests · ${summary.transfer_count} transfers · ${summary.team_count} invited member${summary.team_count === 1 ? "" : "s"}`
            : "Loading your record counts…"}
        </p>
      </section>

      <Button
        variant="outline"
        className="mt-5 h-11 w-full border-border bg-transparent text-muted-foreground hover:text-destructive"
        onClick={() => setLogoutOpen(true)}
      >
        <LogOut className="size-4" />
        Log Out
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Your name is stored on your account and shown in your profile.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">First name</span>
              <Input
                className="h-11"
                maxLength={40}
                value={form.firstName}
                onChange={e => setForm({ ...form, firstName: e.target.value })}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Last name</span>
              <Input
                className="h-11"
                maxLength={40}
                value={form.lastName}
                onChange={e => setForm({ ...form, lastName: e.target.value })}
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveProfile()} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Log out of Vertex?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again to view your balance, records and team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay signed in</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void signOut()}
            >
              {signingOut ? "Logging out…" : "Log out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProfileShell>
  );
}
