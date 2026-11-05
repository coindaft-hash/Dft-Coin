import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { UsersThree, Trophy, Wallet, UserList, Coins, ArrowUpRight, type Icon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { dayTime, money } from "@/components/profile-shell";

export type TeamMember = {
  user_id: string; member: string; joined_at: string; code: string;
  team_level: number; funded: boolean; effective_amount: number;
  reward: number; today_reward: number;
};

function Metric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return <div className="min-w-0 py-3 text-center">
    <p className={`break-all text-lg font-semibold tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
    <p className="mx-auto mt-1 max-w-24 text-xs leading-4 text-muted-foreground">{label}</p>
  </div>;
}

function Action({ icon: Icon, label, to, tone, onClick }: { icon: Icon; label: string; to?: "/records" | "/referral"; tone: string; onClick?: () => void }) {
  const contents = <><span className="profile-tool-icon grid size-10 place-items-center rounded-lg"><Icon weight="duotone" className="!size-7" /></span><span className="whitespace-normal text-center text-[11px] font-medium leading-4">{label}</span></>;
  if (to) return <Button asChild variant="ghost" className="profile-tool h-auto min-h-24 flex-col gap-2 rounded-lg p-1"><Link to={to} search={to === "/records" ? { tab: "rewards" } : {}} data-tone={tone}>{contents}</Link></Button>;
  return <Button variant="ghost" data-tone={tone} onClick={onClick} className="profile-tool h-auto min-h-24 flex-col gap-2 rounded-lg p-1">{contents}</Button>;
}

export function TeamOverview({ rows }: { rows: TeamMember[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const selectedRows = rows.filter(row => row.team_level === selected);
  const blocks = [{ level: 0, title: "My Team", subtitle: "All four levels" }, ...[1,2,3,4].map(level => ({ level, title: `Level ${String.fromCharCode(64 + level)} Data`, subtitle: level === 1 ? "Direct invitations" : `${level} steps from you` }))];
  return <>
    {blocks.map(({ level, title, subtitle }) => {
      const members = level === 0 ? rows : rows.filter(row => row.team_level === level);
      const reward = members.reduce((sum, member) => sum + Number(member.reward), 0);
      const today = members.reduce((sum, member) => sum + Number(member.today_reward), 0);
      const effective = members.reduce((sum, member) => sum + Number(member.effective_amount), 0);
      return <section key={level} className="mt-6 border-t border-border pt-5" aria-label={title}>
        <div className="mb-3 flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{level ? <span className="text-lg font-semibold">{String.fromCharCode(64 + level)}</span> : <UsersThree weight="duotone" className="size-6" />}</span>
          <div><h2 className="text-lg font-semibold">{title}</h2><p className="text-xs text-muted-foreground">{subtitle}</p></div>
        </div>
        <div className="grid grid-cols-4 divide-x divide-border border-y border-border">
          <Metric label="Team Reward" value={money(reward)} highlight />
          <Metric label="Funded Members" value={String(members.filter(row => row.funded).length)} />
          <Metric label="Total Members" value={String(members.length)} />
          <Metric label="Today's Reward" value={money(today)} highlight />
        </div>
        <div className="my-3 flex items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">Credited team deposits</span><span className="font-semibold tabular-nums">{money(effective)}</span></div>
        <div className="grid grid-cols-3 gap-2">
          <Action icon={level === 0 ? Coins : UserList} label={level === 0 ? "Invite Rewards" : "Member List"} tone={level === 0 ? "reward" : "community"} {...(level === 0 ? { to: "/referral" as const } : { onClick: () => setSelected(level) })} />
          <Action icon={Trophy} label="Reward History" tone="reward" to="/records" />
          <Button asChild variant="ghost" className="profile-tool h-auto min-h-24 flex-col gap-2 rounded-lg p-1"><a href="#team-withdrawals" data-tone="payment"><span className="profile-tool-icon grid size-10 place-items-center rounded-lg"><Wallet weight="duotone" className="!size-7" /></span><span className="whitespace-normal text-[11px] leading-4">Team Withdrawals</span></a></Button>
        </div>
      </section>;
    })}
    <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Level {String.fromCharCode(64 + (selected ?? 1))} Members</DialogTitle><DialogDescription>{selectedRows.length} members · account details are masked</DialogDescription></DialogHeader>
        <div className="max-h-80 overflow-y-auto">
          {selectedRows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No members at this level yet.</p> : selectedRows.map(row => <div key={row.user_id} className="flex items-center justify-between gap-3 border-b border-border py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{row.member}</p><p className="mt-1 text-xs text-muted-foreground">{dayTime(row.joined_at)}</p></div><span className="shrink-0 text-xs text-muted-foreground">{row.funded ? "Funded" : "Not funded"}</span></div>)}
        </div>
        <Button asChild variant="outline"><Link to="/referral">Referral details<ArrowUpRight className="size-4" /></Link></Button>
      </DialogContent>
    </Dialog>
  </>;
}