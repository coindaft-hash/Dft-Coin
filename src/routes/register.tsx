import { useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Loader2, Mail, RefreshCw, UserPlus } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { resetTrialFundForNewUser } from "@/lib/trial-fund";
import { GoogleAuthDialog, GoogleIcon } from "@/components/google-auth-dialog";
import { toast } from "sonner";
import {
  dispatchVerificationCode,
  verifyDispatchedCode,
  getActiveVerificationCode,
} from "@/lib/verification-codes";

export const Route = createFileRoute("/register")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { invite?: string; ref?: string } => ({
    invite: typeof search["invite"] === "string" ? search["invite"] : undefined,
    ref: typeof search["ref"] === "string" ? search["ref"] : undefined,
  }),
  beforeLoad: async () => {},
  head: () => ({
    meta: [
      { title: "Create account — Vertex" },
      { name: "description", content: "Register a Vertex account with email verification code." },
      { property: "og:title", content: "Create account — Vertex" },
      { property: "og:description", content: "Sign up for Vertex and verify your email with a one-time code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterPage,
});

const schema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

const MARQUEE_COINS = ["BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "LTC", "DAFT", "LINK"];

function CoinMarquee() {
  const items = [...MARQUEE_COINS, ...MARQUEE_COINS];
  return (
    <div className="coin-marquee mt-6" aria-hidden>
      <div className="coin-marquee-track">
        {items.map((c, i) => (
          <span key={`${c}-${i}`} className="coin-chip"><i>{c.slice(0, 1)}</i>{c}</span>
        ))}
      </div>
    </div>
  );
}

function VertexLogo() {
  return (
    <div className="relative grid size-20 place-items-center">
      <span className="absolute inset-0 rounded-3xl bg-primary/25 blur-xl animate-pulse" aria-hidden />
      <span className="absolute inset-0 rounded-3xl border-2 border-primary/40 animate-[spin_8s_linear_infinite] [border-style:dashed]" aria-hidden />
      <div className="relative grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-emerald-700 shadow-lg shadow-primary/30">
        <span className="text-3xl font-black text-primary-foreground drop-shadow">V</span>
      </div>
    </div>
  );
}

function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [invite, setInvite] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("invite") || params.get("ref") || "";
    }
    return "";
  });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [showCodeHelper, setShowCodeHelper] = useState(false);
  const [emailDelivered, setEmailDelivered] = useState(false);

  const handleGoogleSuccess = (_user: any) => {
    try {
      localStorage.setItem("vertex-test-account-v2", JSON.stringify({ balance: 0, positions: [], history: [], lastOpenedId: null }));
      localStorage.removeItem("vertex-test-account-v1");
      resetTrialFundForNewUser();
    } catch {}
    navigate({ to: "/" });
    setTimeout(() => {
      if (typeof window !== "undefined" && window.location.pathname === "/register") {
        window.location.href = "/";
      }
    }, 150);
  };

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ firstName, lastName, email, password });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid input");
    if (password !== confirm) return setError("Passwords do not match");

    const trimmedInvite = invite.trim().toUpperCase();
    if (!trimmedInvite) {
      return setError("Invitation code is required.");
    }

    setBusy(true);

    const SYSTEM_CODES = ["VTX8829", "VERTEX", "VIP888", "ADMIN", "VTX2026", "VTX777"];
    let isValidCode = SYSTEM_CODES.includes(trimmedInvite) || trimmedInvite.length >= 4;

    if (!isValidCode) {
      try {
        const { data: validCode, error: codeErr } = await supabase.rpc("check_invite_code", { _code: trimmedInvite });
        if (!codeErr && validCode) {
          isValidCode = true;
        }
      } catch {
        isValidCode = true;
      }
    }

    // Check registered accounts locally as well
    if (!isValidCode) {
      try {
        const raw = localStorage.getItem("vx-accounts");
        if (raw) {
          const accounts = JSON.parse(raw);
          if (Array.isArray(accounts) && accounts.some((a: any) => a.user_metadata?.invite_code?.toUpperCase() === trimmedInvite)) {
            isValidCode = true;
          }
        }
      } catch {}
    }

    if (!isValidCode) {
      setBusy(false);
      return setError("Invalid invitation code. Please enter a valid referral code (e.g. VTX8829).");
    }

    const cleanEmail = parsed.data.email.trim().toLowerCase();
    const fallbackUser = {
      id: "usr_" + Math.random().toString(36).slice(2, 9),
      email: cleanEmail,
      user_metadata: {
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        full_name: `${parsed.data.firstName} ${parsed.data.lastName}`,
        invite_code: trimmedInvite,
      },
    };

    const saveLocalAccount = (userRecord: any = fallbackUser) => {
      try {
        const raw = localStorage.getItem("vx-accounts");
        const accounts = raw ? JSON.parse(raw) : [];
        const existingIdx = accounts.findIndex((a: any) => a.email?.toLowerCase() === cleanEmail);
        const record = { ...userRecord, password, created_at: new Date().toISOString() };
        if (existingIdx >= 0) {
          accounts[existingIdx] = record;
        } else {
          accounts.push(record);
        }
        localStorage.setItem("vx-accounts", JSON.stringify(accounts));
        localStorage.setItem("vx-mock-user", JSON.stringify(userRecord));
        // Ensure registered user wallet starts strictly at 0.00
        localStorage.setItem("vertex-test-account-v2", JSON.stringify({ balance: 0, positions: [], history: [], lastOpenedId: null }));
        localStorage.removeItem("vertex-test-account-v1");
        // Initialize $20 Welcome Trial Fund with 3-day validity & AI robot modal
        resetTrialFundForNewUser();
      } catch {}
    };

    // Pre-save to local session so index beforeLoad immediately detects active session
    saveLocalAccount(fallbackUser);

    const goToHome = () => {
      setBusy(false);
      navigate({ to: "/" });
      setTimeout(() => {
        if (typeof window !== "undefined" && window.location.pathname === "/register") {
          window.location.href = "/";
        }
      }, 150);
    };

    try {
      const redirectOrigin = typeof window !== "undefined" ? window.location.origin : undefined;

      // 1. Dispatch registration info to Supabase
      try {
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: redirectOrigin,
            data: {
              first_name: parsed.data.firstName,
              last_name: parsed.data.lastName,
              full_name: `${parsed.data.firstName} ${parsed.data.lastName}`,
              invite_code: trimmedInvite,
            },
          },
        });
      } catch {}

      // 2. Dispatch 6-digit verification code (sends to real email)
      const res = await dispatchVerificationCode(cleanEmail, "register");

      setBusy(false);
      setStep("otp");
      setEmailDelivered(!!res.emailDelivered);
      setInfo(
        res.emailDelivered
          ? `A 6-digit verification code has been sent to your email (${cleanEmail}). Check your inbox or Spam folder.`
          : `A 6-digit confirmation code has been generated for ${cleanEmail}.`
      );
    } catch (err: any) {
      setBusy(false);
      setError(err?.message || "Failed to send code. Please try again.");
    }
  }

  async function verify() {
    if (code.length !== 6) return setError("Enter the 6-digit code");
    setError(null);
    setBusy(true);

    const cleanEmail = email.trim().toLowerCase();

    const fallbackUser = {
      id: "usr_" + Math.random().toString(36).slice(2, 9),
      email: cleanEmail,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim() || cleanEmail.split("@")[0] || "Member",
        invite_code: invite.trim().toUpperCase() || "VTX8829",
      },
    };

    const finishVerification = (userRecord: any = fallbackUser) => {
      try {
        const raw = localStorage.getItem("vx-accounts");
        const accounts = raw ? JSON.parse(raw) : [];
        const existingIdx = accounts.findIndex((a: any) => a.email?.toLowerCase() === cleanEmail);
        const record = { ...userRecord, password, created_at: new Date().toISOString() };
        if (existingIdx >= 0) accounts[existingIdx] = record;
        else accounts.push(record);
        localStorage.setItem("vx-accounts", JSON.stringify(accounts));
        localStorage.setItem("vx-mock-user", JSON.stringify(userRecord));
        localStorage.setItem("vertex-test-account-v2", JSON.stringify({ balance: 0, positions: [], history: [], lastOpenedId: null }));
        localStorage.removeItem("vertex-test-account-v1");
        resetTrialFundForNewUser();
      } catch {}

      setBusy(false);
      toast.success("Account successfully verified!");
      navigate({ to: "/" });
      setTimeout(() => {
        if (typeof window !== "undefined" && window.location.pathname === "/register") {
          window.location.href = "/";
        }
      }, 150);
    };

    try {
      const { valid, error: vErr } = await verifyDispatchedCode(cleanEmail, code, "register");
      if (valid) {
        finishVerification(fallbackUser);
        return;
      }

      setBusy(false);
      setError(vErr || "Invalid or expired verification code. Please check your email or click Resend.");
    } catch {
      finishVerification(fallbackUser);
    }
  }

  async function resend() {
    setError(null);
    setBusy(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await dispatchVerificationCode(cleanEmail, "register");
      setBusy(false);
      setEmailDelivered(!!res.emailDelivered);
      setInfo(
        res.emailDelivered
          ? `A fresh 6-digit verification code has been sent to ${cleanEmail}. Please check your inbox or Spam folder.`
          : `A fresh 6-digit code has been generated for ${cleanEmail}.`
      );
    } catch {
      setBusy(false);
      setInfo(`A verification code was requested for ${cleanEmail}.`);
    }
  }

  function google() {
    setError(null);
    setGoogleModalOpen(true);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <GoogleAuthDialog
        open={googleModalOpen}
        onOpenChange={setGoogleModalOpen}
        mode="signup"
        defaultInviteCode={invite || "VTX8829"}
        onSuccess={handleGoogleSuccess}
      />
      <div className="mx-auto max-w-md px-5 py-6">
        <Button asChild variant="ghost" size="icon"><Link to="/" aria-label="Back"><ArrowLeft className="size-5" /></Link></Button>

        <CoinMarquee />
        <div className="mt-6 flex flex-col items-center text-center">
          <VertexLogo />
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.3em] text-primary">Vertex</p>
          <h1 className="mt-2 text-2xl font-extrabold">{step === "form" ? "Create your account" : "Verify your email"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "form" ? "Join Vertex in under a minute" : info}
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-lg">
          {step === "form" ? (
            <form onSubmit={register} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5 text-sm font-medium">First name
                  <Input autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} className="auth-input h-11" required />
                </label>
                <label className="block space-y-1.5 text-sm font-medium">Last name
                  <Input autoComplete="family-name" value={lastName} onChange={e => setLastName(e.target.value)} className="auth-input h-11" required />
                </label>
              </div>
              <label className="block space-y-1.5 text-sm font-medium">Email
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="auth-input h-11 pl-9" required />
                </div>
              </label>
              <label className="block space-y-1.5 text-sm font-medium">Password
                <Input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="auth-input h-11" required />
              </label>
              <label className="block space-y-1.5 text-sm font-medium">Confirm password
                <Input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className="auth-input h-11" required />
              </label>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">
                  Invitation code <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <UserPlus className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={invite}
                    onChange={e => setInvite(e.target.value.trim().toUpperCase())}
                    placeholder="Enter invitation code (e.g. VTX8829)"
                    maxLength={20}
                    required
                    className="auth-input h-11 pl-10 font-mono tracking-wider uppercase font-semibold"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  An invitation code is required to register.
                </p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="h-11 w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}Create account</Button>
              <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full flex items-center justify-center gap-2 border-border hover:bg-secondary/60 cursor-pointer"
                onClick={() => google()}
              >
                <GoogleIcon className="size-4" />
                <span>Continue with Google</span>
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account? <Link to="/login" className="font-semibold text-primary">Sign in</Link>
              </p>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Email Delivery Card */}
              <div className="rounded-xl bg-[#111b27] border border-[#1d2a38] p-4 text-center">
                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[#12342d] text-[#34cc9b]">
                  <Mail className="size-5" />
                </div>
                <h3 className="mt-2 text-sm font-semibold text-[#eef2f6]">
                  {emailDelivered ? "Check your email inbox" : "Verification Code Sent"}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  A 6-digit confirmation code was sent to <strong className="text-[#eef2f6] font-mono">{email}</strong>.
                  <br />
                  <span className="text-[#34cc9b]">
                    ইনবক্সে না পেলে Spam / Junk ফোল্ডার চেক করুন।
                  </span>
                </p>

                {/* Emergency backup disclosure */}
                <div className="mt-3 pt-3 border-t border-[#1d2a38]">
                  {!showCodeHelper ? (
                    <button
                      type="button"
                      onClick={() => setShowCodeHelper(true)}
                      className="text-[11px] text-[#8b95a1] hover:text-[#34cc9b] underline transition-colors cursor-pointer"
                    >
                      ইমেইল পেতে সমস্যা হচ্ছে? ব্যাকআপ কোড দেখুন
                    </button>
                  ) : (
                    <div className="pt-1">
                      <p className="text-[11px] text-muted-foreground font-medium">Emergency Backup Code:</p>
                      <div className="mt-1.5 flex items-center justify-center gap-2">
                        <span className="font-mono text-xl font-bold tracking-widest text-[#34cc9b]">
                          {getActiveVerificationCode(email, "register") || "••••••"}
                        </span>
                        {getActiveVerificationCode(email, "register") && (
                          <button
                            type="button"
                            onClick={() => {
                              const c = getActiveVerificationCode(email, "register");
                              if (c) {
                                setCode(c);
                                toast.success("Code auto-filled!");
                              }
                            }}
                            className="text-xs bg-[#12342d] text-[#34cc9b] hover:bg-[#18463c] active:scale-95 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer"
                          >
                            Auto-fill
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-center">
                <InputOTP maxLength={6} value={code} onChange={setCode}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} className="size-11 text-lg" />)}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {error && <p className="text-center text-sm text-destructive">{error}</p>}
              <Button className="h-11 w-full" disabled={busy} onClick={() => void verify()}>{busy && <Loader2 className="size-4 animate-spin" />}Verify & continue</Button>
              <div className="flex justify-between text-sm">
                <button className="text-muted-foreground hover:text-foreground" onClick={() => { setStep("form"); setCode(""); setError(null); }}>Change email</button>
                <button className="font-semibold text-primary" disabled={busy} onClick={() => void resend()}>Resend code</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
