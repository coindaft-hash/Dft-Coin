/** Membership levels are derived only from the stored account balance. */
export const TIERS = [
  { name: "Starter", min: 0, blurb: "Account open, no balance requirement." },
  { name: "Silver", min: 1000, blurb: "Balance of $1,000 or more." },
  { name: "Gold", min: 10000, blurb: "Balance of $10,000 or more." },
  { name: "Platinum", min: 50000, blurb: "Balance of $50,000 or more." },
] as const;

export type Tier = (typeof TIERS)[number];

export function tierFor(balance: number) {
  let index = 0;
  TIERS.forEach((tier, i) => {
    if (balance >= tier.min) index = i;
  });
  const current = TIERS[index]!;
  const next = index + 1 < TIERS.length ? TIERS[index + 1]! : null;
  const progress = next
    ? Math.min(100, Math.max(0, ((balance - current.min) / (next.min - current.min)) * 100))
    : 100;
  const remaining = next ? Math.max(0, next.min - balance) : 0;
  return { index, current, next, progress, remaining };
}
