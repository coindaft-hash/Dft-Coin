import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDownLeft, CheckCircle2, Sparkles, User, Clock, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/hooks/use-account";
import {
  type IncomingTransfer,
  listenForIncomingTransfers,
  markTransferSeen,
} from "@/lib/incoming-transfers";
import { creditIncomingTransferOnce } from "@/lib/demo-positions";

function playTransferChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    
    // Note 1 (pleasant melodic bell)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Note 2 (higher bell)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.18, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);
  } catch {
    // Audio autoplay might be limited, ignore gracefully
  }
}

export function IncomingTransferDialog() {
  const { account } = useAccount();
  const [activeTransfer, setActiveTransfer] = useState<IncomingTransfer | null>(null);

  useEffect(() => {
    const emailToListen = account?.email || "";
    if (!emailToListen) return;

    const cleanup = listenForIncomingTransfers(emailToListen, (transfer) => {
      // Real transfer credit: add the received amount to the user's available balance!
      creditIncomingTransferOnce(transfer.id, transfer.amount);
      setActiveTransfer(transfer);
      playTransferChime();
    });

    return cleanup;
  }, [account?.email]);

  const handleClose = () => {
    if (activeTransfer) {
      markTransferSeen(activeTransfer.id);
    }
    setActiveTransfer(null);
  };

  if (!activeTransfer) return null;

  const formattedAmount = `$${activeTransfer.amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const formattedTime = new Date(activeTransfer.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <Dialog open={!!activeTransfer} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md border-emerald-500/30 bg-gradient-to-b from-card to-background p-6 shadow-2xl shadow-emerald-950/40">
        <DialogHeader className="text-center sm:text-center">
          {/* Glowing Animated Icon */}
          <div className="relative mx-auto mb-2 flex size-16 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 shadow-[0_0_30px_rgba(31,214,160,0.35)]">
            <ArrowDownLeft className="size-8 text-emerald-400 animate-pulse" />
            <div className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-emerald-500 text-black shadow-sm">
              <Sparkles className="size-3.5 fill-current" />
            </div>
          </div>

          <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
            <span>Funds Received!</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            An incoming transfer has arrived in your account
          </DialogDescription>
        </DialogHeader>

        {/* Big Amount Card */}
        <div className="my-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-center">
          <span className="text-[11px] font-semibold text-emerald-400/90 tracking-wider uppercase block">
            Amount Credited
          </span>
          <strong className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400 tracking-tight block mt-1">
            +{formattedAmount}
          </strong>
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300/80 mt-1.5">
            <CheckCircle2 className="size-3.5" /> Ready in your Available Balance
          </span>
        </div>

        {/* Transfer Details Breakdown */}
        <div className="rounded-xl border border-border/80 bg-secondary/30 p-3.5 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <User className="size-3.5 text-primary" /> Sent by
            </span>
            <strong className="text-foreground font-medium font-mono truncate max-w-[200px]">
              {activeTransfer.senderEmail}
            </strong>
          </div>

          {activeTransfer.note && (
            <div className="flex items-start justify-between gap-2 border-t border-border/50 pt-2">
              <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                <FileText className="size-3.5 text-primary" /> Note
              </span>
              <p className="text-foreground italic text-right max-w-[200px] break-words">
                "{activeTransfer.note}"
              </p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border/50 pt-2 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" /> Time
            </span>
            <span className="font-mono text-foreground/80">{formattedTime}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-2 flex flex-col gap-2">
          <Button
            className="w-full h-11 font-bold bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
            onClick={handleClose}
          >
            Awesome, Got It!
          </Button>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={handleClose}
          >
            <Link to="/transfer">View Transfers & Balance</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
