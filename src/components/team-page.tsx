import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Copy, Gift, HandCoins, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorNote, LoadingRows, ProfileShell, SignInSection, dayTime, money } from "@/components/profile-shell";
import { useAccount } from "@/hooks/use-account";
import { supabase } from "@/integrations/supabase/client";
import { TeamOverview, type TeamMember } from "@/components/team-overview";


import { getUserInviteCode, getReferralLink, getTeamMembersForUser, getTeamWithdrawalsForUser, getReferralRewardsForUser } from "@/lib/referral-team";

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
        Anyone who registers with your link or code is automatically added to your Level A team, and $5 is credited to your balance when their account opens.
      </p>
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
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [team, teamWithdrawals] = await Promise.all([
      supabase.rpc("my_team_levels", { _day_start: start.toISOString() }),
      supabase.rpc("my_team_withdrawals", { _limit: 50 }),
    ]);

    let memberRows: TeamMember[] = [];
    if (!team.error && Array.isArray(team.data)) {
      memberRows = team.data;
    } else {
      memberRows = getTeamMembersForUser(account);
    }

    let withdrawalRows: WithdrawalRow[] = [];
    if (!teamWithdrawals.error && Array.isArray(teamWithdrawals.data)) {
      withdrawalRows = teamWithdrawals.data as WithdrawalRow[];
    } else {
      withdrawalRows = getTeamWithdrawalsForUser(account);
    }

    setRows(memberRows);
    setWithdrawals(withdrawalRows);
    setState("ready");
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
    const [summary, ledger, team] = await Promise.all([
      supabase.rpc("profile_summary"),
      supabase.from("wallet_ledger").select("*").eq("kind", "referral_bonus").order("created_at", { ascending: false }).limit(50),
      supabase.rpc("my_team"),
    ]);

    const localRewards = getReferralRewardsForUser(account);
    const localTeam = getTeamMembersForUser(account);

    const row = (!summary.error && summary.data ? summary.data : {}) as Record<string, unknown>;
    const earnedVal = Number(row["earnings"] ?? localRewards.total);
    setEarned(earnedVal);

    const teamCount = Array.isArray(team.data) ? team.data.length : localTeam.length;
    setMembers(teamCount);

    const rewardList = Array.isArray(ledger.data) && ledger.data.length > 0
      ? (ledger.data as any[])
      : localRewards.history;
    setRewards(rewardList);
    setState("ready");
  }, [account]);

  useEffect(() => {
    if (account) void load();
  }, [account?.id, load]);

  async function share() {
    if (!code) return;
    const link = getReferralLink(code);
    const message = `Join me on Vertex! Use my invitation code ${code} to claim a $20 Welcome Trial Fund: ${link}`;
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

          <section className="mt-4 grid grid-cols-2 gap-2">
            <div className="min-w-0 rounded-xl border border-border bg-card p-3">
              <HandCoins className="size-4 text-primary" />
              <p className="mt-1.5 text-[10px] text-muted-foreground">Rewards earned</p>
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
            <h2 className="mb-3 text-sm font-semibold">Reward history</h2>
            {state === "loading" ? (
              <LoadingRows rows={2} label="Loading rewards" />
            ) : state === "error" ? (
              <ErrorNote message="Rewards are unavailable. Please retry." onRetry={() => void load()} />
            ) : rewards.length === 0 ? (
              <EmptyState
                icon={Gift}
                title="No rewards yet"
                note="$5 is credited to your balance each time an invited member opens an account."
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
