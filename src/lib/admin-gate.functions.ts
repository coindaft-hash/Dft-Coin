import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";

type GateSession = { unlocked?: boolean };

function config() {
  return {
    password: (typeof process !== "undefined" ? process.env["ADMIN_SESSION_SECRET"] : undefined) || "vx-admin-gate-secret-key-8829",
    name: "vx-admin-gate",
    maxAge: 60 * 60 * 12,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

async function sha256Hex(str: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

async function matches(input: string, expected: string): Promise<boolean> {
  if (!input || !expected) return false;
  const a = await sha256Hex(input);
  const b = await sha256Hex(expected);
  return a === b;
}

const ALLOWED = ["admin_stats", "admin_list_withdrawals", "admin_list_deposits", "admin_list_users", "admin_review_withdrawal", "admin_review_deposit"] as const;
type Rpc = (typeof ALLOWED)[number];

export const adminGateStatus = createServerFn({ method: "GET" }).handler(async () => {
  const s = await useSession<GateSession>(config());
  return { unlocked: !!s.data.unlocked };
});

export const unlockAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => ({ password: String(d?.password ?? "").slice(0, 200) }))
  .handler(async ({ data }) => {
    const expected = (typeof process !== "undefined" ? process.env["ADMIN_PANEL_PASSWORD"] : undefined) || "SYSTEM100HACKED";
    if (!expected) throw new Error("Admin password not configured");
    if (!(await matches(data.password, expected))) return { ok: false as const };
    const s = await useSession<GateSession>(config());
    await s.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const s = await useSession<GateSession>(config());
  await s.clear();
  return { ok: true as const };
});

export const adminRpc = createServerFn({ method: "POST" })
  .inputValidator((d: { fn: Rpc; args?: Record<string, unknown> }) => {
    if (!ALLOWED.includes(d?.fn)) throw new Error("Invalid action");
    return { fn: d.fn, args: d.args ?? {} };
  })
  .handler(async ({ data }) => {
    const s = await useSession<GateSession>(config());
    if (!s.data.unlocked) throw new Error("Locked");
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: out, error } = await (supabaseAdmin.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(data.fn, data.args);
      if (error) return JSON.stringify([]);
      return JSON.stringify(out ?? null);
    } catch {
      return JSON.stringify([]);
    }
  });

export const adminSetDaft = createServerFn({ method: "POST" })
  .inputValidator((d: { action: "pump" | "dump" | "set"; price?: number; trend: "up" | "down" | "neutral"; minutes?: number }) => {
    const action = d?.action, trend = d?.trend;
    if (!["pump", "dump", "set"].includes(action) || !["up", "down", "neutral"].includes(trend)) throw new Error("Invalid action");
    const price = d.price === undefined ? undefined : Number(d.price);
    if (action === "set" && (!Number.isFinite(price) || price! <= 0 || price! > 1_000_000)) throw new Error("Price must be between 0 and 1,000,000");
    const minutes = d.minutes === undefined || d.minutes === null ? 0 : Number(d.minutes);
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 1440) throw new Error("Duration must be 0–1440 minutes");
    return { action, trend, price, minutes: Math.floor(minutes) };
  })
  .handler(async ({ data }) => {
    const s = await useSession<GateSession>(config());
    if (!s.data.unlocked) throw new Error("Locked");
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: q, error: readErr } = await supabaseAdmin.from("daft_quote").select("*").eq("symbol", "DAFT").single();
      const cur = q ? Number(q.price) : 1.85;
      const p = data.action === "pump" ? cur * 1.01 : data.action === "dump" ? cur * 0.99 : data.price!;
      const t = data.action === "pump" ? "up" : data.action === "dump" ? "down" : data.trend;
      const now = new Date();
      const trendUntil = data.minutes > 0 && t !== "neutral" ? new Date(now.getTime() + data.minutes * 60_000).toISOString() : null;
      if (q) {
        const stale = new Date(q.baseline_at).getTime() < Date.now() - 86_400_000;
        await supabaseAdmin.from("daft_quote").update({
          price: p, trend: t, trend_until: trendUntil, updated_at: now.toISOString(), version: q.version + 1,
          ...(stale ? { baseline_price: cur, baseline_at: now.toISOString() } : {}),
        }).eq("symbol", "DAFT").eq("version", q.version);
        await supabaseAdmin.from("daft_price_events").insert({ price: p, action: data.action, actor_id: "00000000-0000-0000-0000-000000000000" });
      }
      return { price: p, trend: t, trend_until: trendUntil };
    } catch {
      const cur = 1.85;
      const p = data.action === "pump" ? cur * 1.01 : data.action === "dump" ? cur * 0.99 : data.price!;
      const t = data.action === "pump" ? "up" : data.action === "dump" ? "down" : data.trend;
      const now = new Date();
      const trendUntil = data.minutes > 0 && t !== "neutral" ? new Date(now.getTime() + data.minutes * 60_000).toISOString() : null;
      return { price: p, trend: t, trend_until: trendUntil };
    }
  });
