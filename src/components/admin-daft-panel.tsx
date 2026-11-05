import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Minus, Save, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminSetDaft } from "@/lib/admin-gate.functions";
import { useCloudDaft } from "@/hooks/use-cloud-daft";

type Trend = "up" | "down" | "neutral";

export function AdminDaftPanel() {
  const run = useServerFn(adminSetDaft);
  const queryClient = useQueryClient();
  const market = useCloudDaft();
  const [price, setPrice] = useState("");
  const [trend, setTrend] = useState<Trend>("up");
  const [minutes, setMinutes] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const n = Number(price);
  const valid = price !== "" && Number.isFinite(n) && n > 0 && n <= 1_000_000;
  const mins = minutes === "" ? 0 : Number(minutes);
  const minsValid = Number.isInteger(mins) && mins >= 0 && mins <= 1440;
  const activeUntil = market.quote?.trend_until ? Date.parse(market.quote.trend_until) : NaN;
  const remaining = Number.isFinite(activeUntil) ? Math.max(0, activeUntil - Date.now()) : 0;

  async function send(action: "set" | "pump" | "dump") {
    setBusy(true); setNotice("");
    try {
      const r = await run({ data: action === "set" ? { action, price: n, trend, minutes: mins } : { action, trend, minutes: mins } });
      await queryClient.invalidateQueries({ queryKey: ["cloud-daft-simulation"] });
      setNotice(`DAFT base price set to ${r.price.toFixed(4)} USDT${r.trend_until ? ` · ${r.trend} for ${mins} min` : ""}`);
      if (action === "set") setPrice("");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Update failed"); }
    finally { setBusy(false); }
  }

  const trends: { v: Trend; label: string; Icon: typeof ArrowUp }[] = [
    { v: "up", label: "Up", Icon: ArrowUp }, { v: "neutral", label: "Flat", Icon: Minus }, { v: "down", label: "Down", Icon: ArrowDown },
  ];

  return (
    <section className="space-y-5 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold">DaftCoin price</h2><p className="text-xs text-muted-foreground">DAFT / USDT</p></div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums">{market.coin?.price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 8 }) ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{market.status === "live" ? "Live" : market.status === "loading" ? "Connecting…" : "Delayed"}</p>
        </div>
      </div>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (valid && !busy) void send("set"); }}>
        <label className="trade-field" htmlFor="vx-daft-price">New price (USDT)
          <Input id="vx-daft-price" type="number" inputMode="decimal" min="0.00000001" max="1000000" step="any" value={price} onChange={e => setPrice(e.target.value)} disabled={busy} />
        </label>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Trend direction">
          {trends.map(({ v, label, Icon }) => (
            <Button key={v} type="button" variant={trend === v ? "default" : "outline"} aria-pressed={trend === v} disabled={busy} onClick={() => setTrend(v)}><Icon className="size-4" />{label}</Button>
          ))}
        </div>
        <label className="trade-field" htmlFor="vx-daft-minutes">Trend duration (minutes, 0 = no timer)
          <Input id="vx-daft-minutes" type="number" inputMode="numeric" min="0" max="1440" step="1" value={minutes} onChange={e => setMinutes(e.target.value)} disabled={busy} placeholder="0" />
        </label>
        {remaining > 0 && (
          <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
            Active timer: {market.quote?.trend} for {Math.ceil(remaining / 60000)} more minute{Math.ceil(remaining / 60000) === 1 ? "" : "s"}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={!valid || !minsValid || busy}><Save className="size-4" />{busy ? "Saving…" : "Set DAFT price"}</Button>
      </form>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" disabled={busy} onClick={() => void send("pump")}><TrendingUp className="size-4" />+1% Pump</Button>
        <Button variant="outline" disabled={busy} onClick={() => void send("dump")}><TrendingDown className="size-4" />−1% Dump</Button>
      </div>
      <p role="status" className="text-sm text-muted-foreground">{notice}</p>
    </section>
  );
}
