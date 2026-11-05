import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Crown,
  HelpCircle,
  Info,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  MessageCircle,
  Save,
  ShieldCheck,
  Wallet2,
} from "lucide-react";
import { toast } from "sonner";
import { EmailConfigModal } from "@/components/email-config-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { EmptyState, ErrorNote, LoadingRows, ProfileShell, SignInSection, money } from "@/components/profile-shell";
import { useAccount } from "@/hooks/use-account";
import { TIERS, tierFor } from "@/lib/vip-tiers";
import { DEPOSIT_NETWORKS, type DepositNetwork } from "@/lib/deposits";
import { supabase } from "@/integrations/supabase/client";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I deposit?",
    a: "Open Deposit from your profile. Send USDT on BSC (BEP20) or Ethereum (ERC20) to the address shown, then enter the transaction ID (TXID) from your wallet and submit.",
  },
  {
    q: "When is a deposit credited to my balance?",
    a: "The TXID is checked against the blockchain. A verified payment still needs an ownership review before it is credited, and the review panel is not live yet — so nothing is added to your balance automatically.",
  },
  {
    q: "How do transfers to another user work?",
    a: "Open Transfer, type the recipient's account email and the amount. The minimum is $1, transfers are instant, and they cannot be reversed. The recipient must have signed in at least once.",
  },
  {
    q: "How do withdrawals work?",
    a: "Choose a network, paste your USDT wallet address and the amount (minimum $10). The amount is held from your balance straight away and queued for manual approval. You can cancel a pending request and the hold is returned.",
  },
  {
    q: "What is the referral bonus?",
    a: "Your invitation code is on your profile. $5 is credited to your balance once per member who registers with your code. Members you invited are listed on My Team with their email masked.",
  },
  {
    q: "What decides my VIP level?",
    a: "Your level comes only from your account balance: Starter from $0, Silver from $1,000, Gold from $10,000 and Platinum from $50,000. It updates as your balance changes.",
  },
  {
    q: "What is Quant?",
    a: "Quant opens a 10-second DAFT/USDT position at 10x leverage from your balance. Minimum 20 USDT, maximum 3 sessions a day. DAFT is a Vertex market price, so a session can end in profit or loss.",
  },
  {
    q: "Why do prices sometimes say Delayed?",
    a: "Market feeds limit how often they answer. When a refresh fails, the last known price stays on screen and is labelled Delayed until a refresh succeeds.",
  },
  {
    q: "Who can see my information?",
    a: "Your balance, records and team are visible only to you. Someone who invited you sees only that you joined; your email is masked in their team list.",
  },
];

function SectionTitle({ icon: Icon, children }: { icon: typeof Crown; children: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
      <Icon className="size-4 text-primary" />
      {children}
    </h2>
  );
}

export function SettingsPage() {
  const { account, checked, reload } = useAccount();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: "", lastName: "" });
  const [pass, setPass] = useState({ next: "", confirm: "" });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [emailConfigOpen, setEmailConfigOpen] = useState(false);

  useEffect(() => {
    if (account) setForm({ firstName: account.firstName, lastName: account.lastName });
  }, [account?.id]);

  async function saveName() {
    setError("");
    setNotice("");
    const first = form.firstName.trim();
    const last = form.lastName.trim();
    if (!first && !last) return setError("Enter at least one name.");
    setBusy("name");
    const { error: err } = await supabase.auth.updateUser({
      data: { first_name: first, last_name: last, full_name: [first, last].filter(Boolean).join(" ") },
    });
    setBusy("");
    if (err) return setError("Your name could not be saved. Please try again.");
    await reload();
    setNotice("Name updated.");
    toast.success("Profile updated");
  }

  async function savePassword() {
    setError("");
    setNotice("");
    if (pass.next.length < 8) return setError("Use at least 8 characters for a password.");
    if (pass.next !== pass.confirm) return setError("The two passwords do not match.");
    setBusy("password");
    const { error: err } = await supabase.auth.updateUser({ password: pass.next });
    setBusy("");
    if (err) return setError(err.message || "Your password could not be changed.");
    setPass({ next: "", confirm: "" });
    setNotice("Password changed.");
    toast.success("Password updated");
  }

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
    setLogoutOpen(false);
    void navigate({ to: "/login" });
  }

  return (
    <ProfileShell title="Settings" back="/profile">
      {!checked ? (
        <LoadingRows rows={3} label="Loading settings" />
      ) : !account ? (
        <SignInSection note="Sign in to manage your account settings." />
      ) : (
        <>
          <section className="mt-5 rounded-2xl border border-border bg-card p-4">
            <SectionTitle icon={ShieldCheck}>Account</SectionTitle>
            <p className="truncate text-sm font-medium">{account.email}</p>
            <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">User ID · {account.id}</p>
          </section>

          {error && (
            <div className="pt-4">
              <ErrorNote message={error} />
            </div>
          )}
          {notice && (
            <p className="mt-4 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary" role="status">
              {notice}
            </p>
          )}

          <form className="mt-5 rounded-2xl border border-border bg-card p-4" onSubmit={e => { e.preventDefault(); void saveName(); }}>
            <SectionTitle icon={Wallet2}>Your name</SectionTitle>
            <div className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium">First name</span>
                <Input className="h-11" maxLength={40} value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium">Last name</span>
                <Input className="h-11" maxLength={40} value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
              </label>
            </div>
            <Button type="submit" className="mt-3 h-11 w-full" disabled={busy === "name"}>
              {busy === "name" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save name
            </Button>
          </form>

          <form className="mt-4 rounded-2xl border border-border bg-card p-4" onSubmit={e => { e.preventDefault(); void savePassword(); }}>
            <SectionTitle icon={KeyRound}>Change password</SectionTitle>
            <div className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium">New password</span>
                <Input
                  type="password"
                  className="h-11"
                  autoComplete="new-password"
                  value={pass.next}
                  onChange={e => setPass({ ...pass, next: e.target.value })}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium">Confirm new password</span>
                <Input
                  type="password"
                  className="h-11"
                  autoComplete="new-password"
                  value={pass.confirm}
                  onChange={e => setPass({ ...pass, confirm: e.target.value })}
                />
              </label>
            </div>
            <Button type="submit" className="mt-3 h-11 w-full" disabled={busy === "password"}>
              {busy === "password" ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              Change password
            </Button>
          </form>

          <Button
            type="button"
            variant="outline"
            className="mt-6 w-full border-[#1d2a38] bg-[#111b27] text-[#34cc9b] hover:bg-[#12342d] hover:text-[#12d49b] font-semibold"
            onClick={() => setEmailConfigOpen(true)}
          >
            <Mail className="size-4 mr-2" />
            Email Service Setup (Free API)
          </Button>

          <EmailConfigModal open={emailConfigOpen} onOpenChange={setEmailConfigOpen} />

          <Button
            variant="outline"
            className="mt-3 w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="size-4" />
            Log Out
          </Button>

          <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Log out of Vertex?</AlertDialogTitle>
                <AlertDialogDescription>You will need to sign in again to see your balance and records.</AlertDialogDescription>
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
        </>
      )}
    </ProfileShell>
  );
}

export function VipPage() {
  const { account, checked } = useAccount();
  const [balance, setBalance] = useState<number | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    const { data, error } = await supabase.rpc("ensure_my_wallet");
    if (error) {
      setState("error");
      return;
    }
    setBalance(Number(data));
    setState("ready");
  }, []);

  useEffect(() => {
    if (account) void load();
  }, [account?.id, load]);

  const tier = tierFor(balance ?? 0);

  return (
    <ProfileShell title="VIP Level" back="/profile">
      {!checked ? (
        <LoadingRows rows={3} label="Loading level" />
      ) : !account ? (
        <SignInSection note="Sign in to see your membership level." />
      ) : (
        <>
          <section className="mt-5 rounded-2xl border border-border bg-gradient-to-br from-primary/20 via-card to-card p-4">
            <div className="flex items-center gap-2">
              <Crown className="size-5 text-primary" />
              <p className="text-lg font-bold">{tier.current.name}</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{tier.current.blurb}</p>
            {state === "ready" && (
              <>
                <Progress value={tier.progress} className="mt-4" aria-label="Progress to the next level" />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {tier.next
                    ? `${money(tier.remaining)} more balance reaches ${tier.next.name}.`
                    : "You are at the highest level."}
                </p>
              </>
            )}
            {state === "error" && (
              <div className="mt-4">
                <ErrorNote message="Your balance is unavailable. Please retry." onRetry={() => void load()} />
              </div>
            )}
          </section>

          <section className="mt-6">
            <SectionTitle icon={Info}>All levels</SectionTitle>
            <ul className="space-y-2">
              {TIERS.map((item, i) => (
                <li
                  key={item.name}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${i === tier.index ? "border-primary/50 bg-primary/10" : "border-border bg-card"}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{item.blurb}</p>
                  </div>
                  {i === tier.index && <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">Current</span>}
                </li>
              ))}
            </ul>
          </section>

          <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
            Your level is calculated from your account balance only. It does not change deposit, withdrawal or transfer rules.
          </p>
        </>
      )}
    </ProfileShell>
  );
}

export function FaqPage() {
  return (
    <ProfileShell title="FAQ" back="/profile">
      <section className="mt-5">
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((item, i) => (
            <AccordionItem key={item.q} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-sm">{item.q}</AccordionTrigger>
              <AccordionContent className="text-xs leading-5 text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
      <Button asChild variant="outline" className="mt-6 w-full">
        <Link to="/support">
          <MessageCircle className="size-4" />
          Still need help?
        </Link>
      </Button>
    </ProfileShell>
  );
}

export function SupportPage() {
  return (
    <ProfileShell title="Support" back="/profile">
      <section className="mt-5 rounded-2xl border border-border bg-card p-4">
        <SectionTitle icon={ShieldCheck}>Current status</SectionTitle>
        <ul className="space-y-2 text-[11px] leading-5 text-muted-foreground">
          <li>Deposits: transaction IDs are checked on-chain; verified payments still need an ownership review before credit.</li>
          <li>Withdrawals: requests are held from your balance and queued for manual approval.</li>
          <li>Transfers: instant between signed-in accounts and cannot be reversed.</li>
          <li>Prices: crypto from Binance, Bybit or OKX; forex from daily reference rates, labelled when delayed.</li>
        </ul>
      </section>

      <div className="mt-5">
        <EmptyState
          icon={MessageCircle}
          title="Telegram support is not connected yet"
          note="Ask the site owner for the support channel link. Once it is added, this page opens it directly."
        />
      </div>

      <Button asChild variant="outline" className="mt-5 w-full">
        <Link to="/faq">
          <HelpCircle className="size-4" />
          Read the FAQ
        </Link>
      </Button>
    </ProfileShell>
  );
}

export function WalletManagementPage() {
  const { account, checked, reload } = useAccount();
  const [balance, setBalance] = useState<number | null>(null);
  const [network, setNetwork] = useState<DepositNetwork>("bsc");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.rpc("ensure_my_wallet");
    if (!err) setBalance(Number(data));
  }, []);

  useEffect(() => {
    if (!account) return;
    void load();
    setAddress(account.withdrawAddress);
    setNetwork(account.withdrawNetwork === "ethereum" ? "ethereum" : "bsc");
  }, [account?.id, load]);

  async function save() {
    setError("");
    setNotice("");
    const value = address.trim();
    if (!ADDRESS.test(value)) return setError("Enter a valid USDT wallet address (0x followed by 40 characters).");
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({
      data: { withdraw_address: value, withdraw_network: network },
    });
    setBusy(false);
    if (err) return setError("The address could not be saved. Please try again.");
    await reload();
    setNotice("Withdrawal address saved to your account.");
    toast.success("Wallet address saved");
  }

  async function clear() {
    setError("");
    setNotice("");
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({
      data: { withdraw_address: "", withdraw_network: "" },
    });
    setBusy(false);
    if (err) return setError("The address could not be removed. Please try again.");
    setAddress("");
    await reload();
    setNotice("Saved withdrawal address removed.");
  }

  return (
    <ProfileShell title="Wallet Management" back="/profile">
      {!checked ? (
        <LoadingRows rows={3} label="Loading wallet" />
      ) : !account ? (
        <SignInSection note="Sign in to manage your wallet details." />
      ) : (
        <>
          <section className="mt-5 rounded-2xl border border-border bg-card p-4 text-center">
            <p className="text-xs text-muted-foreground">Available balance</p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums">{balance === null ? "—" : money(balance)}</p>
          </section>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Button asChild variant="outline" className="h-auto flex-col gap-1.5 rounded-xl py-3">
              <Link to="/deposit">
                <ArrowDownLeft className="size-4 text-primary" />
                <span className="text-[10px] font-semibold">Deposit</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col gap-1.5 rounded-xl py-3">
              <Link to="/withdraw">
                <ArrowUpRight className="size-4 text-primary" />
                <span className="text-[10px] font-semibold">Withdraw</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col gap-1.5 rounded-xl py-3">
              <Link to="/transfer">
                <ArrowLeftRight className="size-4 text-primary" />
                <span className="text-[10px] font-semibold">Transfer</span>
              </Link>
            </Button>
          </div>

          <form className="mt-5 rounded-2xl border border-border bg-card p-4" onSubmit={e => { e.preventDefault(); void save(); }}>
            <SectionTitle icon={Wallet2}>Saved withdrawal address</SectionTitle>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1" role="group" aria-label="Address network">
              {(Object.keys(DEPOSIT_NETWORKS) as DepositNetwork[]).map(n => (
                <Button
                  key={n}
                  type="button"
                  className="h-10"
                  variant={network === n ? "default" : "ghost"}
                  aria-pressed={network === n}
                  disabled={busy}
                  onClick={() => setNetwork(n)}
                >
                  {DEPOSIT_NETWORKS[n].label}
                  <span className="text-[10px] opacity-70">{DEPOSIT_NETWORKS[n].standard}</span>
                </Button>
              ))}
            </div>
            <label className="mt-3 block space-y-1.5">
              <span className="text-xs font-medium">USDT wallet address</span>
              <Input
                className="h-11 font-mono text-xs"
                autoComplete="off"
                spellCheck={false}
                maxLength={42}
                placeholder="0x…"
                value={address}
                onChange={e => setAddress(e.target.value)}
                disabled={busy}
              />
            </label>
            {error && (
              <div className="mt-3">
                <ErrorNote message={error} />
              </div>
            )}
            {notice && (
              <p className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary" role="status">
                {notice}
              </p>
            )}
            <Button type="submit" className="mt-3 h-11 w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save address
            </Button>
            {account.withdrawAddress && (
              <Button type="button" variant="ghost" className="mt-2 h-9 w-full text-muted-foreground" disabled={busy} onClick={() => void clear()}>
                Remove saved address
              </Button>
            )}
            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
              This address is stored only on your own account and is used to prefill withdrawal requests. Only USDT on the
              selected network is supported.
            </p>
          </form>
        </>
      )}
    </ProfileShell>
  );
}
