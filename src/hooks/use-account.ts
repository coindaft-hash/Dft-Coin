import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Account = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  initials: string;
  withdrawAddress: string;
  withdrawNetwork: string;
  inviteCode: string;
  referredBy?: string;
};

function text(meta: Record<string, unknown>, key: string) {
  return typeof meta[key] === "string" ? (meta[key] as string).trim() : "";
}

function toAccount(id: string, email: string, meta: Record<string, unknown>): Account {
  const firstName = text(meta, "first_name");
  const lastName = text(meta, "last_name");
  const stored = text(meta, "full_name");
  const fullName = stored || [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0] || "Member";
  const initials =
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(word => word[0]?.toUpperCase() ?? "")
      .join("") || "V";
  const inviteCode =
    text(meta, "my_invite_code") ||
    text(meta, "invite_code") ||
    text(meta, "referral_code") ||
    "";
  const referredBy = text(meta, "referred_by");

  return {
    id,
    email,
    firstName,
    lastName,
    fullName,
    initials,
    withdrawAddress: text(meta, "withdraw_address"),
    withdrawNetwork: text(meta, "withdraw_network"),
    inviteCode,
    referredBy: referredBy || undefined,
  };
}

/** Reads the signed-in account from the auth session; refreshes on auth changes. */
export function useAccount() {
  const [account, setAccount] = useState<Account | null>(null);
  const [checked, setChecked] = useState(false);

  const reload = useCallback(async () => {
    // Read the locally stored session (no network round-trip); the server still enforces access on every data request.
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      setAccount(null);
      setChecked(true);
      return;
    }
    setAccount(toAccount(user.id, user.email ?? "", (user.user_metadata ?? {}) as Record<string, unknown>));
    setChecked(true);
  }, []);

  useEffect(() => {
    void reload();
    const { data: listener } = supabase.auth.onAuthStateChange(event => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") setTimeout(() => void reload(), 0);
    });
    return () => listener.subscription.unsubscribe();
  }, [reload]);

  return { account, checked, reload };
}
