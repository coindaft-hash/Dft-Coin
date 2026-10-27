import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ShieldCheck, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, KeyRound } from "lucide-react";
import { AdminPanel } from "@/components/admin/admin-panel";

const ADMIN_ACCESS_KEY = "SYSTEM100HACKED";
const SESSION_KEY = "vx_admin_authenticated";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Portal — Vertex" },
      { name: "description", content: "Vertex Exchange Operations & Financial Control Panel." },
      { property: "og:title", content: "Admin Portal — Vertex" },
      { property: "og:description", content: "Vertex Exchange Operations & Financial Control Panel." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminRouteWrapper,
});

function AdminRouteWrapper() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(SESSION_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      if (password.trim() === ADMIN_ACCESS_KEY) {
        try {
          sessionStorage.setItem(SESSION_KEY, "true");
        } catch {}
        setIsAuthenticated(true);
        setError(null);
      } else {
        setError("Invalid security key. Access denied.");
      }
      setLoading(false);
    }, 250);
  };

  const handleLock = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
    setIsAuthenticated(false);
    setPassword("");
  };

  if (isAuthenticated) {
    return <AdminPanel onLock={handleLock} />;
  }

  return (
    <div className="min-h-screen bg-[#060a12] text-[#e8edf2] flex flex-col justify-center items-center p-4 selection:bg-[#09c48d]/20 selection:text-[#09c48d] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#09c48d]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#00d4ff]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Security Gate Card */}
      <div className="w-full max-w-[420px] rounded-3xl bg-[#0b1320]/90 border border-[#172537] p-7 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        {/* Top Header */}
        <div className="text-center space-y-3">
          <div className="size-14 rounded-2xl bg-gradient-to-tr from-[#09c48d]/20 to-[#00d4ff]/20 border border-[#09c48d]/30 text-[#09c48d] grid place-items-center mx-auto shadow-lg shadow-[#09c48d]/10">
            <KeyRound className="size-7" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#09c48d]/10 text-[#09c48d] border border-[#09c48d]/20 mb-2">
              <ShieldCheck className="size-3.5" />
              RESTRICTED ACCESS
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Vertex Operations Desk
            </h1>
            <p className="text-xs text-[#7b8c9f] mt-1 leading-relaxed">
              Enter administrator authorization key to access live platform controls and financial desk.
            </p>
          </div>
        </div>

        {/* Password Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-semibold text-[#a5b6c9] mb-1.5"
            >
              Administrator Password
            </label>
            <div className="relative flex items-center h-12 rounded-xl bg-[#060a12] border border-[#1b2b3f] px-3.5 focus-within:border-[#09c48d] focus-within:ring-1 focus-within:ring-[#09c48d] transition-all">
              <Lock className="size-4 text-[#5a6a7c] mr-2.5 shrink-0" />
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter security key..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                required
                autoFocus
                className="w-full h-full bg-transparent text-sm text-white placeholder-[#5a6a7c] outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="p-1 text-[#6b7b8f] hover:text-[#e8edf2] transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            {error && (
              <p className="text-xs text-[#ff5a63] mt-2 font-medium flex items-center gap-1.5 animate-in fade-in-50">
                <span className="size-1 rounded-full bg-[#ff5a63]" />
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full h-12 rounded-xl bg-[#09c48d] hover:bg-[#0bd69a] text-[#04140e] font-bold text-sm tracking-tight flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#09c48d]/20"
          >
            <span>{loading ? "Verifying Key..." : "Unlock Admin Panel"}</span>
            <ArrowRight className="size-4 stroke-[2.5]" />
          </button>
        </form>

        {/* Back Link */}
        <div className="pt-2 border-t border-[#152335] text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#7b8c9f] hover:text-white transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Return to Vertex Exchange</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
