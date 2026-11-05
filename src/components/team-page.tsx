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
  const tiers = [
    {
      level: "A",
      title: "Level 1 (Direct)",
      bengali: "১ম লেভেল",
      rate: "5%",
      desc: "Direct invitations",
      example: "$100 = +$5.00",
      borderTone: "border-emerald-500/40 bg-gradient-to-b from-emerald-500/15 via-emerald-500/5 to-transparent",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      accentDot: "bg-emerald-400 shadow-[0_0_8px_#34d399]",
    },
    {
      level: "B",
      title: "Level 2 (Tier 2)",
      bengali: "২য় লেভেল",
      rate: "3%",
      desc: "2nd step downline",
      example: "$100 = +$3.00",
      borderTone: "border-cyan-500/40 bg-gradient-to-b from-cyan-500/15 via-cyan-500/5 to-transparent",
      badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
      accentDot: "bg-cyan-400 shadow-[0_0_8px_#22d3ee]",
    },
    {
      level: "C",
      title: "Level 3 (Tier 3)",
      bengali: "৩য় লেভেল",
      rate: "2%",
      desc: "3rd step downline",
      example: "$100 = +$2.00",
      borderTone: "border-amber-500/40 bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      accentDot: "bg-amber-400 shadow-[0_0_8px_#fbbf24]",
    },
    {
      level: "D",
      title: "Level 4 (Tier 4)",
      bengali: "৪র্থ লেভেল",
      rate: "1%",
      desc: "4th step downline",
      example: "$100 = +$1.00",
      borderTone: "border-purple-500/40 bg-gradient-to-b from-purple-500/15 via-purple-500/5 to-transparent",
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
      accentDot: "bg-purple-400 shadow-[0_0_8px_#c084fc]",
    },
  ];

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-[#0b1623] via-[#08101a] to-[#040810] p-4 shadow-xl shadow-primary/5 space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="relative grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-primary to-emerald-500 text-primary-foreground shadow-lg shadow-primary/25">
            <Percent className="size-5 font-black" />
            <span className="absolute -top-1 -right-1 flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-extrabold tracking-tight text-white">Recharge Commission</h2>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                4 Tiers
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Commissions are earned when team members recharge
            </p>
          </div>
        </div>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {tiers.map(t => (
          <div
            key={t.level}
            className={`group relative overflow-hidden rounded-xl border ${t.borderTone} p-3 flex flex-col justify-between transition-all duration-200 hover:border-opacity-80`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`size-1.5 rounded-full ${t.accentDot}`} />
                  <span className="text-xs font-bold text-white tracking-wide">
                    Level {t.level}
                  </span>
                </div>
                <span className={`rounded-md border px-1.5 py-0.5 font-mono text-xs font-black ${t.badgeColor}`}>
                  {t.rate}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">{t.bengali} · {t.desc}</p>
            </div>

            <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">Per $100</span>
              <span className="font-mono font-bold text-white">
                {t.example.split("= ")[1]}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Explanatory Policy Box */}
      <div className="rounded-xl bg-black/40 border border-border/60 p-3 space-y-1.5 text-[11px]">
        <div className="flex items-center gap-1.5 text-primary font-semibold text-xs">
          <Zap className="size-3.5 text-primary" />
          <span>কমিশন পাওয়ার নিয়ম (Commission Rule)</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          • আপনার টিমের কোনো মেম্বার যখনই একাউন্টে ফান্ড রিচার্জ বা ডিপোজিট করবে, আপনি সাথে সাথে তার রিচার্জের উপর কমিশন পাবেন:
        </p>
        <div className="grid grid-cols-2 gap-1.5 pt-1 font-mono text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
            <span>১ম লেভেল:</span> <strong className="font-bold">৫%</strong>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">
            <span>২য় লেভেল:</span> <strong className="font-bold">৩%</strong>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
            <span>৩য় লেভেল:</span> <strong className="font-bold">২%</strong>
          </div>
          <div className="flex items-center gap-1.5 text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
            <span>৪র্থ লেভেল:</span> <strong className="font-bold">১%</strong>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground pt-1 flex items-center gap-1 text-emerald-400">
          <Sparkles className="size-3 shrink-0" />
          <span>ডিপোজিট অ্যাপ্রুভ হওয়ার সাথে সাথে ব্যালেন্সে কমিশন স্বয়ংক্রিয়ভাবে যোগ হবে।</span>
        </p>
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
