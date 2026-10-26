import { useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Lock, LogIn, Mail } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { GoogleAuthDialog, GoogleIcon } from "@/components/google-auth-dialog";

export const Route = createFileRoute("/login")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const hasLocal = typeof window !== "undefined" && Boolean(localStorage.getItem("vx-mock-user"));
      if (data?.session || hasLocal) throw redirect({ to: "/" });
    } catch (err) {
      if ((err as any)?.to) throw err;
    }
  },
  head: () => ({
    meta: [
      { title: "Sign in — Vertex" },
      { name: "description", content: "Sign in to your Vertex account with email and password." },
      { property: "og:title", content: "Sign in — Vertex" },
      { property: "og:description", content: "Access your Vertex account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(1, "Enter your password").max(72),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [welcome, setWelcome] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);

  const handleGoogleSuccess = (_user: any) => {
    setWelcome(true);
    setTimeout(() => {
      navigate({ to: "/" });
      setTimeout(() => {
        if (typeof window !== "undefined" && window.location.pathname === "/login") {
          window.location.href = "/";
        }
      }, 150);
    }, 400);
  };

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid input");
    setBusy(true);

    const cleanEmail = parsed.data.email.trim().toLowerCase();

    const goToHome = () => {
      setBusy(false);
      setWelcome(true);
      setTimeout(() => {
        navigate({ to: "/" });
        setTimeout(() => {
          if (typeof window !== "undefined" && window.location.pathname === "/login") {
            window.location.href = "/";
          }
        }, 150);
      }, 500);
    };

    const tryLocalLogin = (): boolean => {
      try {
        const raw = localStorage.getItem("vx-accounts");
        const accounts = raw ? JSON.parse(raw) : [];
        const matched = accounts.find((a: any) => a.email?.toLowerCase() === cleanEmail);
        if (matched) {
          if (matched.password && password && matched.password !== password) {
            setError("Incorrect password.");
            return false;
          }
          localStorage.setItem("vx-mock-user", JSON.stringify(matched));
          goToHome();
          return true;
        } else {
          setError("No account found with this email. Please register first.");
          return false;
        }
      } catch {
        return false;
      }
    };

    try {
      const { data, error: loginErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (loginErr) {
        const localSuccess = tryLocalLogin();
        setBusy(false);
        if (!localSuccess && !error) {
          setError(loginErr.message || "Login failed. Check your password.");
        }
        return;
      }

      // Also ensure local mock sync for offline availability
      if (data?.user) {
        try {
          localStorage.setItem("vx-mock-user", JSON.stringify(data.user));
        } catch {}
      }

      goToHome();
    } catch {
      setBusy(false);
      const localSuccess = tryLocalLogin();
      if (!localSuccess) {
        setError("Login failed. Please verify your credentials or try again.");
      }
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
        mode="signin"
        onSuccess={handleGoogleSuccess}
      />
      {welcome && (
        <div className="login-welcome fixed inset-0 z-50 grid place-items-center bg-background">
          <div className="flex flex-col items-center text-center">
            <div className="login-welcome-logo grid size-20 place-items-center rounded-3xl bg-primary/15 text-3xl font-extrabold text-primary ring-1 ring-primary/40">V</div>
            <p className="login-welcome-text mt-5 text-xl font-extrabold">Welcome to Vertex</p>
            <p className="login-welcome-text mt-1 text-sm text-muted-foreground">Loading your dashboard…</p>
            <div className="mt-6 h-1 w-40 overflow-hidden rounded-full bg-muted"><div className="login-welcome-bar h-full bg-primary" /></div>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-md px-5 py-6">
        <Button asChild variant="ghost" size="icon"><Link to="/" aria-label="Back"><ArrowLeft className="size-5" /></Link></Button>

        <div className="mt-6 flex flex-col items-center text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <LogIn className="size-7" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your Vertex account</p>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-lg">
          <form onSubmit={login} className="space-y-4">
            <label className="block space-y-1.5 text-sm font-medium">Email
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="h-11 pl-9" />
              </div>
            </label>
            <label className="block space-y-1.5 text-sm font-medium">Password
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="h-11 pl-9" />
              </div>
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="h-11 w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}Sign in</Button>
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
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            No account yet? <Link to="/register" className="font-semibold text-primary">Create one</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
