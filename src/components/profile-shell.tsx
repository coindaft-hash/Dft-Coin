import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/bottom-navigation";

export const money = (n: number) =>
  `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const signedMoney = (n: number) => `${n < 0 ? "−" : "+"}${money(n)}`;
export const dayTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

type Back = "/" | "/profile";

/** Shared mobile-first frame: title bar, centred column, bottom navigation. */
export function ProfileShell({
  title,
  back = "/",
  action,
  children,
}: {
  title: string;
  back?: Back;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background pb-28 text-foreground">
      <div className="mx-auto max-w-md px-5">
        <header className="grid h-20 grid-cols-[40px_1fr_40px] items-center border-b border-border">
          <Button asChild variant="ghost" size="icon">
            <Link to={back} aria-label="Back">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <h1 className="truncate text-center text-xl font-bold">{title}</h1>
          <div className="flex justify-end">{action}</div>
        </header>
        {children}
      </div>
      <BottomNavigation active="Profile" />
    </main>
  );
}

export function LoadingRows({ rows = 3, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div className="space-y-2 py-6" aria-live="polite" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  note,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  note: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center">
      <Icon className="size-6 text-muted-foreground" />
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-[30ch] text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-destructive/10 px-3 py-2" role="alert">
      <p className="text-xs leading-5 text-destructive">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="shrink-0" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function SignInSection({ note }: { note: string }) {
  return (
    <section className="space-y-4 py-10 text-center">
      <p className="text-sm text-muted-foreground">{note}</p>
      <div className="flex justify-center gap-2">
        <Button asChild>
          <Link to="/login">Sign in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/register">Create account</Link>
        </Button>
      </div>
    </section>
  );
}
