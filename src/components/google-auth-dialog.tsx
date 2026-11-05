import { useState } from "react";
import { Loader2, ShieldCheck, UserCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function GoogleIcon({ className = "size-5 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

interface GoogleAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "signup" | "signin";
  defaultInviteCode?: string;
  onSuccess: (user: any) => void;
}

export function GoogleAuthDialog({
  open,
  onOpenChange,
  mode,
  defaultInviteCode = "VTX8829",
  onSuccess,
}: GoogleAuthDialogProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [inviteCode, setInviteCode] = useState(defaultInviteCode || "VTX8829");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid Google email address.");
      return;
    }

    const trimmedInvite = inviteCode.trim().toUpperCase() || "VTX8829";

    setBusy(true);

    setTimeout(() => {
      try {
        const raw = typeof localStorage !== "undefined" ? localStorage.getItem("vx-accounts") : null;
        const accounts = raw ? JSON.parse(raw) : [];

        let matched = accounts.find((a: any) => a.email?.toLowerCase() === cleanEmail);

        if (!matched) {
          const derivedName = fullName.trim() || cleanEmail.split("@")[0] || "Google User";
          const parts = derivedName.split(" ");
          const firstName = parts[0] || "User";
          const lastName = parts.slice(1).join(" ") || "";

          matched = {
            id: "usr_g_" + Math.random().toString(36).slice(2, 9),
            email: cleanEmail,
            user_metadata: {
              first_name: firstName,
              last_name: lastName,
              full_name: derivedName,
              invite_code: trimmedInvite,
              provider: "google",
              avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(derivedName)}`,
            },
            created_at: new Date().toISOString(),
          };

          accounts.push(matched);
          if (typeof localStorage !== "undefined") {
            localStorage.setItem("vx-accounts", JSON.stringify(accounts));
          }
        }

        if (typeof localStorage !== "undefined") {
          localStorage.setItem("vx-mock-user", JSON.stringify(matched));
        }

        setBusy(false);
        onOpenChange(false);
        onSuccess(matched);
      } catch {
        setBusy(false);
        setError("Failed to authenticate with Google. Please retry.");
      }
    }, 450);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0d1626] border border-border text-foreground shadow-2xl p-6 sm:rounded-2xl">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="grid size-12 place-items-center rounded-2xl bg-white/10 border border-white/15 shadow-md mb-2">
            <GoogleIcon className="size-6" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Continue with Google
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {mode === "signup"
              ? "Sign up to Vertex instantly using your Google Account"
              : "Sign in to your Vertex account using Google"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300" htmlFor="google-email">
              Google Email Address
            </label>
            <Input
              id="google-email"
              type="email"
              placeholder="name@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 bg-card/80 border-border text-sm"
              required
              autoFocus
            />
          </div>

          {mode === "signup" && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300" htmlFor="google-name">
                  Full Name (Optional)
                </label>
                <Input
                  id="google-name"
                  type="text"
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-11 bg-card/80 border-border text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300" htmlFor="google-invite">
                  Referral / Invitation Code
                </label>
                <Input
                  id="google-invite"
                  type="text"
                  placeholder="VTX8829"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.trim().toUpperCase())}
                  className="h-11 bg-card/80 border-border text-sm font-mono uppercase tracking-wider font-semibold"
                />
                <p className="text-[11px] text-muted-foreground">
                  Default: <strong className="text-emerald-400">VTX8829</strong>
                </p>
              </div>
            </>
          )}

          {error && <p className="text-xs text-destructive font-medium">{error}</p>}

          <Button
            type="submit"
            className="w-full h-11 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <GoogleIcon className="size-4" />
                <span>{mode === "signup" ? "Sign up with Google" : "Sign in with Google"}</span>
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-1">
            <ShieldCheck className="size-3.5 text-emerald-400" />
            <span>Secure 256-bit encryption · Risk-free account</span>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
