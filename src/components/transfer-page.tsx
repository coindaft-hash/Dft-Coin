import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowLeftRight, ArrowDownLeft, ArrowUpRight, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNavigation } from "@/components/bottom-navigation";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { broadcastIncomingTransfer } from "@/lib/incoming-transfers";
import { useTestAccount, deductAvailableBalance, formatMoney } from "@/lib/demo-positions";

type TransferRow = { id: string; sender_id: string; recipient_id: string; sender_email: string; recipient_email: string; amount: number; note: string; created_at: string };
const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function TransferPage() {
  const { availableBalance, frozenBalance, totalBalance } = useTestAccount();
  const [userId, setUserId] = useState<string | null>(null);
  const [myEmail, setMyEmail] = useState("");
  const [checked, setChecked] = useState(false);
  const [rows, setRows] = useState<TransferRow[]>([]);
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setChecked(true);
    setUserId(data.user?.id ?? null);
    setMyEmail(data.user?.email ?? "");
    if (!data.user) {
      setRows([]);
      return;
    }
    const t = await supabase.from("wallet_transfers").select("*").order("created_at", { ascending: false }).limit(50);
    if (!t.error) setRows((t.data ?? []) as TransferRow[]);
  }, []);

  useEffect(() => {
    void load();
    const { data: l } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_IN" || e === "SIGNED_OUT") setTimeout(() => void load(), 0);
    });
    return () => l.subscription.unsubscribe();
  }, [load]);

  async function send() {
    setError("");
    setSuccess("");
    const value = Number(amount);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter the recipient's account email.");
    if (email.trim().toLowerCase() === myEmail.toLowerCase()) return setError("You cannot send to yourself.");
    if (!Number.isFinite(value) || value < 1) return setError("Minimum transfer is $1.00.");
    if (value > availableBalance) return setError("Insufficient available balance.");

    setBusy(true);
    const sentAmount = Math.round(value * 100) / 100;
    const recipient = email.trim();
    const transferNote = note.trim();

    try {
      // 1. Deduct directly from sender's Available Balance
      deductAvailableBalance(sentAmount);

      // 2. Real server/mock RPC call
      await supabase.rpc("transfer_funds", {
        _recipient_email: recipient,
        _amount: sentAmount,
        _note: transferNote,
      });

      // 3. Broadcast incoming transfer to recipient (adds to recipient's available balance & displays celebrate modal)
      const transferId = "trf_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
      broadcastIncomingTransfer({
        id: transferId,
        senderEmail: myEmail || "A Vertex Member",
        recipientEmail: recipient,
        amount: sentAmount,
        note: transferNote || undefined,
        timestamp: Date.now(),
      });

      // 4. Update UI transfer history
      const newRow: TransferRow = {
        id: transferId,
        sender_id: userId || "me",
        recipient_id: recipient,
        sender_email: myEmail || "me",
        recipient_email: recipient,
        amount: sentAmount,
        note: transferNote,
        created_at: new Date().toISOString(),
      };
      setRows((prev) => [newRow, ...prev]);

      setSuccess(`Successfully sent ${money(sentAmount)} to ${recipient}`);
      setAmount("");
      setNote("");
    } catch (err: any) {
      setError(err?.message || "Transfer failed. Please check the recipient and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signIn() {
    setBusy(true);
    try {
      const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/transfer` });
      if (r.error) setError("Sign-in failed. Please try again.");
    } catch {
      setError("Sign-in unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground pb-28">
      <div className="mx-auto max-w-md px-5">
        <header className="grid h-20 grid-cols-[40px_1fr_40px] items-center border-b border-border">
          <Button asChild variant="ghost" size="icon">
            <Link to="/" aria-label="Back to Home">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <h1 className="text-center text-xl font-bold">Transfer</h1>
          <ArrowLeftRight className="size-5 justify-self-end text-primary" />
        </header>

        {!checked ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : !userId ? (
          <section className="py-10 text-center space-y-4">
            <p className="text-muted-foreground text-sm">Sign in to send dollars to another user.</p>
            <Button className="w-full h-11" disabled={busy} onClick={() => void signIn()}>
              {busy && <Loader2 className="size-4 animate-spin" />}Sign in to transfer
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </section>
        ) : (
          <>
            {/* Balance Overview: ONLY Available Balance is shown for Transfer, with note on frozen funds */}
            <section className="py-6 border-b border-border text-center">
              <p className="text-xs uppercase tracking-wider font-semibold text-emerald-400">Available Balance</p>
              <p className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-foreground mt-1">
                {money(availableBalance)}
              </p>
              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span>Total: <strong className="text-foreground">{money(totalBalance)}</strong></span>
                <span>·</span>
                <span>Frozen in trades: <strong className="text-amber-400">{money(frozenBalance)}</strong></span>
              </div>
              <p className="text-[11px] text-muted-foreground/80 mt-1 font-mono">{myEmail}</p>
            </section>

            <form
              className="py-6 space-y-4 border-b border-border"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <label className="block space-y-2">
                <span className="text-sm font-semibold">Recipient email</span>
                <Input
                  type="email"
                  inputMode="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  required
                />
              </label>

              <label className="block space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Amount (USD)</span>
                  <span className="text-xs text-muted-foreground">
                    Max: <strong className="text-foreground">{money(availableBalance)}</strong>
                  </span>
                </div>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={availableBalance}
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-11"
                  required
                />
              </label>

              <div className="grid grid-cols-4 gap-2">
                {[10, 50, 100, 500].map((v) => (
                  <Button
                    key={v}
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={v > availableBalance}
                    onClick={() => setAmount(String(v))}
                  >
                    ${v}
                  </Button>
                ))}
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-semibold">Note (optional)</span>
                <Input
                  maxLength={120}
                  placeholder="What's it for?"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-11"
                />
              </label>

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-sm text-primary font-medium" role="status">
                  {success}
                </p>
              )}

              <Button type="submit" className="w-full h-11 font-semibold" disabled={busy || availableBalance < 1}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {busy ? "Sending…" : "Send Transfer"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Transfers are instant and deducted directly from your available balance.
              </p>
            </form>

            <section className="py-6">
              <h2 className="text-sm font-semibold mb-3">Transfer history</h2>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transfers yet.</p>
              ) : (
                <ul className="space-y-2">
                  {rows.map((r) => {
                    const out = r.sender_id === userId || r.sender_email === myEmail;
                    return (
                      <li key={r.id} className="flex items-center gap-3 rounded-lg bg-secondary p-3">
                        <span
                          className={`flex size-9 items-center justify-center rounded-full ${
                            out ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
                          }`}
                        >
                          {out ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {out ? `To ${r.recipient_email}` : `From ${r.sender_email}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleString()}
                            {r.note ? ` · ${r.note}` : ""}
                          </p>
                        </div>
                        <span className={`text-sm font-semibold font-mono ${out ? "text-destructive" : "text-primary"}`}>
                          {out ? "−" : "+"}
                          {money(Number(r.amount))}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
      <BottomNavigation />
    </main>
  );
}
