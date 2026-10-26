import { useEffect, useState } from "react";
import { Check, Copy, Share2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/use-account";
import { getUserInviteCode, getReferralLink } from "@/lib/referral-team";

export function MyInviteCode() {
  const { account } = useAccount();
  const [code, setCode] = useState<string>(() => getUserInviteCode(account));
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let alive = true;
    const local = getUserInviteCode(account);
    if (local) setCode(local);

    void supabase.rpc("ensure_my_invite_code").then(({ data }) => {
      if (alive && typeof data === "string" && data.length >= 4) {
        setCode(data);
      }
    });
    return () => {
      alive = false;
    };
  }, [account]);

  const referralLink = getReferralLink(code);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast.success("Invitation code copied: " + code);
    } catch {
      toast.error("Copy unavailable");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
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
          text: `Join me on Vertex! Use my invitation code ${code} to claim a $20 Welcome Trial Fund.`,
          url: referralLink,
        });
        return;
      } catch {}
    }
    await copyLink();
  };

  return (
    <div className="mx-4 mt-4 rounded-2xl border border-border bg-card p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
            <UserPlus className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">My Invitation Code</p>
            <p className="font-mono font-bold tracking-wider text-base text-primary">{code}</p>
          </div>
        </div>
        <Button size="sm" variant="secondary" className="h-8 gap-1.5 px-3 text-xs" onClick={copyCode}>
          {copiedCode ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
          {copiedCode ? "Copied" : "Copy Code"}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-muted-foreground">Referral link</p>
          <p className="font-mono text-xs text-muted-foreground truncate">{referralLink}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 gap-1" onClick={copyLink}>
            {copiedLink ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
            <span>Link</span>
          </Button>
          <Button size="sm" variant="default" className="h-7 text-xs px-2.5 gap-1" onClick={shareLink}>
            <Share2 className="size-3" />
            <span>Share</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
