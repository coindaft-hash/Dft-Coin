import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Copy, Gift, HandCoins, Share2, Users, Percent, Zap, Sparkles, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorNote, LoadingRows, ProfileShell, SignInSection, dayTime, money } from "@/components/profile-shell";
import { useAccount } from "@/hooks/use-account";
import { supabase } from "@/integrations/supabase/client";
import { TeamOverview, type TeamMember } from "@/components/team-overview";


import {
  getUserInviteCode,
  getReferralLink,
  getTeamMembersForUser,
  getTeamWithdrawalsForUser,
  getReferralRewardsForUser,
  fetchTeamMembersAsync,
  fetchTeamWithdrawalsAsync,
} from "@/lib/referral-team";

function useInviteCode() {
  const { account } = useAccount();
  const [code, setCode] = useState<string>(() => getUserInviteCode(account));
  useEffect(() => {
    let alive = true;
    const local = getUserInviteCode(account);
    if (local) setCode(local);
    void supabase.rpc("ensure_my_invite_code").then(({ data }) => {
      if (alive && typeof data === "string" && data.length >= 4) setCode(data);
    });
    return () => {
      alive = false;
    };
  }, [account]);
  return code;
}

function CodeCard({ code, saved, onSave }: { code: string; saved: boolean; onSave: () => void }) {
  const referralLink = getReferralLink(code);
  const [linkCopied, setLinkCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast.success("Referral link copied to clipboard");
    } catch {
      toast.error("Copy unavailable");
    }
  };

  const shareLink = async () => {
    const nav = navigator as Navigator & {
      share?: (data: { title: string; text: string; url: string }) => Promise<void>;
    };
    if (nav.share) {
      try {
        await nav.share({
          title: "Join Vertex",
          text: `Join me on Vertex! Use my invitation code ${code} to get a $20 Welcome Trial Fund.`,
          url: referralLink,
        });
        return;
      } catch {}
    }
    await copyLink();
  };

  return (
    <section className="mt-5 rounded-2xl border border-border bg-gradient-to-br from-primary/20 via-card to-card p-4 space-y-3">
      <div>
        <p className="text-xs text-muted-foreground">Your invitation code</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="min-w-0 flex-1 truncate font-mono text-2xl font-extrabold tracking-wider text-primary">{code}</p>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 px-3 text-xs" onClick={onSave} aria-label={saved ? "Code copied" : "Copy invitation code"}>
            {saved ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
            {saved ? "Copied" : "Copy Code"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-background/50 p-2.5">
        <p className="text-[10px] text-muted-foreground">Your referral link</p>
        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{referralLink}</p>
        <div className="mt-2 flex items-center gap-2">
          <Button variant="secondary" size="sm" className="h-7 text-xs flex-1 gap-1.5" onClick={copyLink}>
            {linkCopied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
            <span>{linkCopied ? "Link Copied" : "Copy Link"}</span>
          </Button>
          <Button variant="default" size="sm" className="h-7 text-xs flex-1 gap-1.5" onClick={shareLink}>
            <Share2 className="size-3" />
            <span>Share Link</span>
          </Button>
        </div>
      </div>

      <p className="text-[11px] leading-5 text-muted-foreground">
        Anyone who registers with your link or code is automatically added to your Level A team. When they recharge their account, you instantly receive a 5% commission credited directly to your balance.
      </p>
    </section>
  );
}

export function RechargeCommissionCard() {
  return (
    <section
      className="mt-5 relative w-full overflow-hidden text-white font-['Inter',system-ui,sans-serif]"
      style={{
        borderRadius: "28px",
        padding: "24px 20px 22px",
        background: `
          radial-gradient(900px 400px at 0% 100%, rgba(25, 230, 140, .28), transparent 60%),
          radial-gradient(700px 360px at 100% 0%, rgba(25, 230, 140, .16), transparent 60%),
          linear-gradient(160deg, #081a2e 0%, #050d1c 60%, #06141f 100%)
        `,
        boxShadow: "0 0 0 3px rgba(25, 230, 140, .9), 0 0 40px rgba(25, 230, 140, .35), inset 0 0 60px rgba(25, 230, 140, .08)",
      }}
    >
      {/* Header with left icon, centered titlebox, right icon */}
      <div className="flex items-center justify-between gap-3">
        {/* Left 3D Coin Graphic */}
        <div className="shrink-0 w-14 sm:w-20" style={{ filter: "drop-shadow(0 8px 18px rgba(0,0,0,.45))" }}>
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <defs>
              <linearGradient id="goldGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffe600" />
                <stop offset="60%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              <linearGradient id="greenGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
            {/* Base Sack/Stack */}
            <circle cx="50" cy="55" r="32" fill="url(#greenGrad1)" />
            <ellipse cx="50" cy="38" rx="28" ry="12" fill="#10b981" />
            {/* Gold Coins Stack */}
            <ellipse cx="45" cy="48" rx="22" ry="8" fill="url(#goldGrad1)" stroke="#fef08a" strokeWidth="1.5" />
            <ellipse cx="45" cy="42" rx="22" ry="8" fill="url(#goldGrad1)" stroke="#fef08a" strokeWidth="1.5" />
            <ellipse cx="45" cy="36" rx="22" ry="8" fill="url(#goldGrad1)" stroke="#fef08a" strokeWidth="1.5" />
            <ellipse cx="58" cy="32" rx="18" ry="7" fill="url(#goldGrad1)" stroke="#fef08a" strokeWidth="1.5" />
            <circle cx="58" cy="32" r="8" fill="#f59e0b" opacity="0.6" />
            <text x="55" y="36" fontSize="11" fontWeight="bold" fill="#fff" fontFamily="monospace">$</text>
            {/* Sparkles */}
            <polygon points="22,24 25,18 28,24 34,27 28,30 25,36 22,30 16,27" fill="#ffe600" />
            <polygon points="76,46 78,42 80,46 84,48 80,50 78,54 76,50 72,48" fill="#19e68c" />
          </svg>
        </div>

        {/* Center Titlebox */}
        <div className="flex-1 text-center min-w-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#19e68c]/15 border border-[#19e68c]/40 text-[#19e68c] text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1">
            <span className="size-1.5 rounded-full bg-[#19e68c] animate-pulse" />
            Team Referral
          </div>
          <h2 className="m-0 font-extrabold text-2xl sm:text-4xl tracking-tight leading-tight text-white drop-shadow">
            REFERRAL <span style={{ color: "#19e68c" }}>COMMISSION</span>
          </h2>
          <p className="mt-1 text-xs sm:text-sm font-medium text-[#dbe6f2] max-w-md mx-auto leading-snug">
            Earn 4-tier recharge commissions on every team deposit
          </p>
        </div>

        {/* Right 3D Trophy / Emblem Graphic */}
        <div className="shrink-0 w-12 sm:w-16" style={{ filter: "drop-shadow(0 8px 18px rgba(0,0,0,.45))" }}>
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <defs>
              <linearGradient id="goldCup" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fffbeb" />
                <stop offset="30%" stopColor="#fde047" />
                <stop offset="70%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#854d0e" />
              </linearGradient>
            </defs>
            {/* Trophy Pedestal */}
            <rect x="36" y="74" width="28" height="12" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
            <rect x="42" y="62" width="16" height="14" fill="#334155" />
            {/* Cup Body */}
            <path d="M26 22 L74 22 C74 46 62 62 50 62 C38 62 26 46 26 22 Z" fill="url(#goldCup)" stroke="#fef08a" strokeWidth="1.5" />
            {/* Handles */}
            <path d="M26 26 C14 26 14 44 28 44" stroke="#fde047" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M74 26 C86 26 86 44 72 44" stroke="#fde047" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Star on Cup */}
            <polygon points="50,30 52,36 58,36 53,40 55,46 50,42 45,46 47,40 42,36 48,36" fill="#fff" />
            {/* Sparkles */}
            <polygon points="78,16 80,12 82,16 86,18 82,20 80,24 78,20 74,18" fill="#ffe600" />
          </svg>
        </div>
      </div>

      {/* 4 Tiers Grid */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Level 1: 5% */}
        <div
          className="rounded-2xl p-3 text-center flex flex-col justify-between transition-transform duration-200 hover:scale-[1.02]"
          style={{
            background: "linear-gradient(180deg, rgba(8, 26, 46, 0.95) 0%, rgba(5, 13, 28, 0.95) 100%)",
            border: "2px solid #19e68c",
            boxShadow: "0 0 20px rgba(25, 230, 140, 0.28)",
          }}
        >
          <div>
            <span className="inline-block rounded-full bg-[#19e68c]/20 border border-[#19e68c]/40 px-2.5 py-0.5 text-[10px] font-bold text-[#19e68c] uppercase tracking-wider">
              Level 1 · Direct
            </span>
            <div
              className="mt-2 text-3xl sm:text-4xl font-black font-mono tracking-tight"
              style={{ color: "#19e68c", filter: "drop-shadow(0 0 10px rgba(25, 230, 140, 0.5))" }}
            >
              5%
            </div>
            <p className="mt-0.5 text-[11px] font-semibold text-white/90">Direct Referral</p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-white/10 text-[10px] font-mono text-[#ffe600] font-bold">
            $100 = +$5.00
          </div>
        </div>

        {/* Level 2: 3% */}
        <div
          className="rounded-2xl p-3 text-center flex flex-col justify-between transition-transform duration-200 hover:scale-[1.02]"
          style={{
            background: "linear-gradient(180deg, rgba(8, 26, 46, 0.95) 0%, rgba(5, 13, 28, 0.95) 100%)",
            border: "1.5px solid rgba(255, 230, 0, 0.75)",
            boxShadow: "0 0 16px rgba(255, 230, 0, 0.2)",
          }}
        >
          <div>
            <span className="inline-block rounded-full bg-[#ffe600]/20 border border-[#ffe600]/40 px-2.5 py-0.5 text-[10px] font-bold text-[#ffe600] uppercase tracking-wider">
              Level 2 · Tier 2
            </span>
            <div
              className="mt-2 text-3xl sm:text-4xl font-black font-mono tracking-tight"
              style={{ color: "#ffe600", filter: "drop-shadow(0 0 10px rgba(255, 230, 0, 0.45))" }}
            >
              3%
            </div>
            <p className="mt-0.5 text-[11px] font-semibold text-white/90">2nd Tier</p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-white/10 text-[10px] font-mono text-[#ffe600] font-bold">
            $100 = +$3.00
          </div>
        </div>

        {/* Level 3: 2% */}
        <div
          className="rounded-2xl p-3 text-center flex flex-col justify-between transition-transform duration-200 hover:scale-[1.02]"
          style={{
            background: "linear-gradient(180deg, rgba(8, 26, 46, 0.95) 0%, rgba(5, 13, 28, 0.95) 100%)",
            border: "1.5px solid rgba(0, 212, 255, 0.75)",
            boxShadow: "0 0 16px rgba(0, 212, 255, 0.2)",
          }}
        >
          <div>
            <span className="inline-block rounded-full bg-[#00d4ff]/20 border border-[#00d4ff]/40 px-2.5 py-0.5 text-[10px] font-bold text-[#00d4ff] uppercase tracking-wider">
              Level 3 · Tier 3
            </span>
            <div
              className="mt-2 text-3xl sm:text-4xl font-black font-mono tracking-tight"
              style={{ color: "#00d4ff", filter: "drop-shadow(0 0 10px rgba(0, 212, 255, 0.45))" }}
            >
              2%
            </div>
            <p className="mt-0.5 text-[11px] font-semibold text-white/90">3rd Tier</p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-white/10 text-[10px] font-mono text-[#ffe600] font-bold">
            $100 = +$2.00
          </div>
        </div>

        {/* Level 4: 1% */}
        <div
          className="rounded-2xl p-3 text-center flex flex-col justify-between transition-transform duration-200 hover:scale-[1.02]"
          style={{
            background: "linear-gradient(180deg, rgba(8, 26, 46, 0.95) 0%, rgba(5, 13, 28, 0.95) 100%)",
            border: "1.5px solid rgba(192, 132, 252, 0.75)",
            boxShadow: "0 0 16px rgba(192, 132, 252, 0.2)",
          }}
        >
          <div>
            <span className="inline-block rounded-full bg-[#c084fc]/20 border border-[#c084fc]/40 px-2.5 py-0.5 text-[10px] font-bold text-[#c084fc] uppercase tracking-wider">
              Level 4 · Tier 4
            </span>
            <div
              className="mt-2 text-3xl sm:text-4xl font-black font-mono tracking-tight"
              style={{ color: "#c084fc", filter: "drop-shadow(0 0 10px rgba(192, 132, 252, 0.45))" }}
            >
              1%
            </div>
            <p className="mt-0.5 text-[11px] font-semibold text-white/90">4th Tier</p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-white/10 text-[10px] font-mono text-[#ffe600] font-bold">
            $100 = +$1.00
          </div>
        </div>
      </div>

      {/* Bottom Commission Policy Note */}
      <div
        className="mt-4 rounded-xl p-3 flex items-start gap-2.5 text-xs text-[#dbe6f2] leading-relaxed"
        style={{
          background: "rgba(5, 11, 22, 0.75)",
          border: "1px solid rgba(25, 230, 140, 0.35)",
        }}
      >
        <div className="size-5 rounded-full bg-[#19e68c]/20 text-[#19e68c] grid place-items-center font-bold text-xs shrink-0 mt-0.5">
          ✓
        </div>
        <div>
          <strong className="text-[#19e68c]">Commission Rules:</strong> Tiered commissions of 5%, 3%, 2%, and 1% are automatically credited to your balance immediately upon downline deposit approval.
        </div>
      </div>
    </section>
  );
}

type WithdrawalRow = {
  id: string;
  member: string;
  team_level: number;
  network: string;
  amount: number;
  status: string;
  created_at: string;
};

const withdrawalTone: Record<string, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  rejected: "border-red-500/30 bg-red-500/10 text-red-400",
  cancelled: "border-border bg-muted text-muted-foreground",
};

const levelName = ["A", "B", "C", "D"];

function TeamWithdrawals({ rows }: { rows: WithdrawalRow[] }) {
  const total = rows.filter(r => r.status !== "rejected" && r.status !== "cancelled").reduce((sum, r) => sum + Number(r.amount), 0);
  return (
    <section id="team-withdrawals" className="mt-6 scroll-mt-20 border-t border-border pt-5" aria-label="Team Withdrawals">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <HandCoins className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">Team Withdrawals</h2>
          <p className="text-xs text-muted-foreground">Withdrawal requests from your Level A–D members</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] text-muted-foreground">Total</p>
          <p className="text-sm font-semibold tabular-nums">{money(total)}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={HandCoins} title="No team withdrawals yet" note="When members of your team request a withdrawal, it will appear here." />
      ) : (
        <ul className="space-y-2">
          {rows.map(row => (
            <li key={row.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    <span className="mr-1.5 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Level {levelName[row.team_level - 1] ?? row.team_level}</span>
                    {row.member}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{row.network} · {dayTime(row.created_at)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">{money(Number(row.amount))}</p>
                  <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${withdrawalTone[row.status] ?? withdrawalTone["pending"]}`}>{row.status}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function TeamPage() {
  const { account, checked } = useAccount();
  const code = useInviteCode();
  const [rows, setRows] = useState<TeamMember[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [memberRows, withdrawalRows] = await Promise.all([
        fetchTeamMembersAsync(account),
        fetchTeamWithdrawalsAsync(account),
      ]);
      setRows(memberRows);
      setWithdrawals(withdrawalRows);
      setState("ready");
    } catch {
      setRows(getTeamMembersForUser(account));
      setWithdrawals(getTeamWithdrawalsForUser(account));
      setState("ready");
    }
  }, [account]);

  useEffect(() => {
    if (account) void load();
  }, [account?.id, load]);

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success("Invitation code copied: " + code);
    } catch {
      toast.error("Copy unavailable. Select the code and copy it manually.");
    }
  }

  return (
    <ProfileShell title="My Team" back="/profile">
      {!checked ? (
        <LoadingRows rows={3} label="Loading team" />
      ) : !account ? (
        <SignInSection note="Sign in to see the members you have invited." />
      ) : (
        <>
          {code && <CodeCard code={code} saved={saved} onSave={() => void copy()} />}

          {state === "loading" ? <LoadingRows rows={4} label="Loading team levels" /> : state === "error" ? <div className="mt-5"><ErrorNote message="Your team data is unavailable. Please retry." onRetry={() => void load()} /></div> : <><TeamOverview rows={rows} /><TeamWithdrawals rows={withdrawals} /></>}

          <Button asChild variant="outline" className="mt-6 w-full">
            <Link to="/referral">
              <Gift className="size-4" />
              Referral rewards
            </Link>
          </Button>
        </>
      )}
    </ProfileShell>
  );
}

export function ReferralPage() {
  const { account, checked } = useAccount();
  const code = useInviteCode();
  const [earned, setEarned] = useState<number | null>(null);
  const [rewards, setRewards] = useState<{ id: string; amount: number; note: string; created_at: string }[]>([]);
  const [members, setMembers] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const teamMembers = await fetchTeamMembersAsync(account);
      const localRewards = getReferralRewardsForUser(account);
      const teamEarnings = teamMembers.reduce((sum, m) => sum + (Number(m.reward) || 0), 0);
      const totalEarned = Math.max(localRewards.total, teamEarnings);
      setEarned(Number(totalEarned.toFixed(2)));
      setMembers(teamMembers.length);

      let rewardList = localRewards.history;
      if (rewardList.length === 0 && teamMembers.some(m => (m.reward || 0) > 0)) {
        rewardList = teamMembers
          .filter(m => (m.reward || 0) > 0)
          .map((m, idx) => {
            const levelLetter = String.fromCharCode(64 + m.team_level);
            const rate = m.team_level === 1 ? "5%" : m.team_level === 2 ? "3%" : m.team_level === 3 ? "2%" : "1%";
            return {
              id: `rew_${idx}_${m.user_id}`,
              amount: m.reward,
              note: `Level ${levelLetter} (${rate}) Recharge Commission · ${m.member} deposit of $${m.effective_amount.toFixed(2)}`,
              created_at: m.joined_at,
            };
          });
      }
      setRewards(rewardList);
      setState("ready");
    } catch {
      const localRewards = getReferralRewardsForUser(account);
      const localTeam = getTeamMembersForUser(account);
      const teamEarnings = localTeam.reduce((sum, m) => sum + (Number(m.reward) || 0), 0);
      setEarned(Math.max(localRewards.total, teamEarnings));
      setMembers(localTeam.length);
      setRewards(localRewards.history);
      setState("ready");
    }
  }, [account]);

  useEffect(() => {
    if (account) void load();
  }, [account?.id, load]);

  async function share() {
    if (!code) return;
    const link = getReferralLink(code);
    const message = `Join me on Vertex! Use my invitation code ${code} to get started: ${link}`;
    const nav = navigator as Navigator & { share?: (data: { title: string; text: string; url: string }) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: "Join Vertex", text: message, url: link });
        return;
      } catch {
        /* user dismissed the share sheet */
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success("Referral link copied to clipboard");
    } catch {
      toast.error("Copy unavailable. Share the code yourself.");
    }
  }

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success("Invitation code copied: " + code);
    } catch {
      toast.error("Copy unavailable. Select the code and copy it manually.");
    }
  }

  return (
    <ProfileShell title="Referral" back="/profile">
      {!checked ? (
        <LoadingRows rows={3} label="Loading referral" />
      ) : !account ? (
        <SignInSection note="Sign in to get your referral code and rewards." />
      ) : (
        <>
          {code && <CodeCard code={code} saved={saved} onSave={() => void copy()} />}

          {/* Fresh 4-Level Recharge Commission Card */}
          <RechargeCommissionCard />

          <section className="mt-4 grid grid-cols-2 gap-2">
            <div className="min-w-0 rounded-xl border border-border bg-card p-3">
              <HandCoins className="size-4 text-primary" />
              <p className="mt-1.5 text-[10px] text-muted-foreground">Recharge Commissions</p>
              <p className="truncate text-lg font-bold tabular-nums">{earned === null ? "—" : money(earned)}</p>
            </div>
            <div className="min-w-0 rounded-xl border border-border bg-card p-3">
              <Users className="size-4 text-primary" />
              <p className="mt-1.5 text-[10px] text-muted-foreground">Members invited</p>
              <p className="truncate text-lg font-bold tabular-nums">{members}</p>
            </div>
          </section>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button onClick={() => void share()}>
              <Share2 className="size-4" />
              Share code
            </Button>
            <Button asChild variant="outline">
              <Link to="/team">
                <Users className="size-4" />
                My team
              </Link>
            </Button>
          </div>

          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold">Commission History</h2>
            {state === "loading" ? (
              <LoadingRows rows={2} label="Loading rewards" />
            ) : state === "error" ? (
              <ErrorNote message="Rewards are unavailable. Please retry." onRetry={() => void load()} />
            ) : rewards.length === 0 ? (
              <EmptyState
                icon={Gift}
                title="No recharge commissions yet"
                note="You earn commissions when invited members recharge (Level 1: 5%, Level 2: 3%, Level 3: 2%, Level 4: 1%)."
              />
            ) : (
              <ul className="space-y-2">
                {rewards.map(row => (
                  <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.note}</p>
                      <p className="text-[10px] text-muted-foreground">{dayTime(row.created_at)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-primary">+{money(Number(row.amount))}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </ProfileShell>
  );
}
