import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Lock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminConsole } from "@/components/admin-console";
import { AdminDaftPanel } from "@/components/admin-daft-panel";
import { adminGateStatus, lockAdmin, unlockAdmin } from "@/lib/admin-gate.functions";

export const Route = createFileRoute("/vx-control")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Control Panel — Vertex" },
    { name: "description", content: "Private Vertex operations panel." },
    { property: "og:title", content: "Control Panel — Vertex" },
    { property: "og:description", content: "Private Vertex operations panel." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: ControlPanel,
});

function ControlPanel() {
  const status = useServerFn(adminGateStatus);
  const unlock = useServerFn(unlockAdmin);
  const lock = useServerFn(lockAdmin);
  const [state, setState] = useState<"checking" | "locked" | "open">("checking");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { status().then(r => setState(r.unlocked ? "open" : "locked")).catch(() => setState("locked")); }, [status]);

  if (state === "checking") return <div className="exchange-shell py-10 text-center text-sm text-muted-foreground">Loading…</div>;

  if (state === "locked") return (
    <div className="exchange-shell flex min-h-screen items-center">
      <form className="w-full space-y-4 rounded-2xl border border-border bg-card p-6" onSubmit={async e => {
        e.preventDefault(); setBusy(true); setErr("");
        try { const r = await unlock({ data: { password: pw } }); if (r.ok) { setPw(""); setState("open"); } else setErr("Incorrect password"); }
        catch { setErr("Unavailable, try again"); } finally { setBusy(false); }
      }}>
        <div className="flex items-center gap-2"><Lock className="size-5 text-primary" /><h1 className="text-lg font-semibold">Admin Panel</h1></div>
        <Input type="password" autoComplete="current-password" aria-label="Password" value={pw} onChange={e => setPw(e.target.value)} />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button type="submit" className="w-full" disabled={busy || !pw}>{busy ? "Checking…" : "Enter"}</Button>
      </form>
    </div>
  );

  return (
    <div className="exchange-shell">
      <header className="markets-header">
        <div><h1 className="markets-title">Admin Panel</h1><p className="markets-subtitle">DAFT price · Recharge · Withdrawals · Users</p></div>
        <Button variant="outline" size="sm" onClick={async () => { await lock(); setState("locked"); }}><LogOut className="size-4" />Lock</Button>
      </header>
      <main className="space-y-6 py-6"><AdminDaftPanel /><AdminConsole /></main>
    </div>
  );
}
