import { supabase } from "@/integrations/supabase/client";
import { getUserInviteCode } from "@/lib/referral-team";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  balance: number;
  frozen_balance: number;
  total_deposit: number;
  total_withdraw: number;
  created_at: string;
  status: "active" | "blocked";
  role?: "user" | "admin";
  referred_by?: string | null;
  invite_code?: string;
}

export interface AdminDeposit {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  amount: number;
  network: string;
  tx_hash: string;
  status: "completed" | "pending" | "rejected";
  reject_reason?: string;
  created_at: string;
}

export interface AdminWithdrawal {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  amount: number;
  network: string;
  address: string;
  status: "pending" | "approved" | "rejected";
  reject_reason?: string;
  created_at: string;
  processed_at?: string;
}

export interface ChartDayData {
  date: string;
  rawDate: string;
  deposit: number;
  withdraw: number;
}

const STORAGE_USERS = "vx_admin_users";
const STORAGE_WITHDRAWALS = "vx_admin_withdrawals";
const STORAGE_DEPOSITS = "vx_admin_deposits";
const STORAGE_BLOCKED_USERS = "vx_blocked_users";

function getBlockedUserIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_BLOCKED_USERS);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

function saveBlockedUserIds(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_BLOCKED_USERS, JSON.stringify(Array.from(set)));
  } catch {}
}

/**
 * Loads REAL registered users from local storage accounts and Supabase.
 * Returns strictly genuine registered users — NO mock/dummy placeholder data.
 */
export function getAdminUsers(): AdminUser[] {
  if (typeof window === "undefined") return [];

  const blockedSet = getBlockedUserIds();
  const usersMap = new Map<string, AdminUser>();

  // 1. Read real accounts registered locally in vx-accounts
  try {
    const raw = localStorage.getItem("vx-accounts");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((acc: any) => {
          if (!acc || (!acc.email && !acc.id)) return;
          const email = (acc.email || "").trim().toLowerCase();
          const id = acc.id || `usr_${email.replace(/[^a-z0-9]/g, "")}`;
          const firstName = acc.user_metadata?.first_name || acc.first_name || "";
          const lastName = acc.user_metadata?.last_name || acc.last_name || "";
          const name = (
            acc.name ||
            acc.full_name ||
            acc.user_metadata?.full_name ||
            `${firstName} ${lastName}`.trim() ||
            email.split("@")[0] ||
            "Registered Member"
          ).trim();

          const inviteCode =
            acc.user_metadata?.my_invite_code ||
            acc.invite_code ||
            acc.my_invite_code ||
            getUserInviteCode(acc);

          const referredBy =
            acc.user_metadata?.referred_by ||
            acc.referred_by ||
            null;

          const isBlocked = blockedSet.has(id) || blockedSet.has(email) || acc.status === "blocked";

          usersMap.set(id, {
            id,
            name,
            email,
            phone: acc.phone || acc.user_metadata?.phone || "—",
            balance: Number(acc.balance || 0),
            frozen_balance: Number(acc.frozen_balance ?? 20.0), // $20 trial fund
            total_deposit: Number(acc.total_deposit || 0),
            total_withdraw: Number(acc.total_withdraw || 0),
            created_at: acc.created_at || new Date().toISOString(),
            status: isBlocked ? "blocked" : "active",
            role: acc.role || "user",
            referred_by: referredBy,
            invite_code: inviteCode,
          });
        });
      }
    }
  } catch {}

  // Also read stored admin users from vx_admin_users
  try {
    const rawAdmin = localStorage.getItem(STORAGE_USERS);
    if (rawAdmin) {
      const parsed = JSON.parse(rawAdmin);
      if (Array.isArray(parsed)) {
        parsed.forEach((u: any) => {
          if (!u || (!u.email && !u.id)) return;
          const id = u.id || `usr_${u.email}`;
          if (!usersMap.has(id)) {
            usersMap.set(id, {
              id,
              name: u.name || u.full_name || u.email?.split("@")[0] || "Registered User",
              email: u.email,
              phone: u.phone || "—",
              balance: Number(u.balance || 0),
              frozen_balance: Number(u.frozen_balance ?? 20.0),
              total_deposit: Number(u.total_deposit || 0),
              total_withdraw: Number(u.total_withdraw || 0),
              created_at: u.created_at || new Date().toISOString(),
              status: u.status === "blocked" ? "blocked" : "active",
              role: u.role || "user",
              referred_by: u.referred_by || null,
              invite_code: u.invite_code || "VTX8829",
            });
          }
        });
      }
    }
  } catch {}

  // 2. Read active logged in user from vx-mock-user if not already present
  try {
    const currentRaw = localStorage.getItem("vx-mock-user");
    if (currentRaw) {
      const curr = JSON.parse(currentRaw);
      if (curr && (curr.email || curr.id)) {
        const id = curr.id || "usr_active_session";
        const email = (curr.email || "").trim().toLowerCase();
        if (!usersMap.has(id) && email) {
          const name = (
            curr.user_metadata?.full_name ||
            curr.full_name ||
            `${curr.user_metadata?.first_name || ""} ${curr.user_metadata?.last_name || ""}`.trim() ||
            email.split("@")[0]
          ).trim();

          let liveBal = 0;
          try {
            const rawWallet = localStorage.getItem("vertex-test-account-v2") || localStorage.getItem("vertex-test-account-v1");
            if (rawWallet) {
              const w = JSON.parse(rawWallet);
              liveBal = Number(w.balance || 0);
            }
          } catch {}

          const inviteCode = curr.user_metadata?.my_invite_code || getUserInviteCode(curr);
          const referredBy = curr.user_metadata?.referred_by || null;
          const isBlocked = blockedSet.has(id) || blockedSet.has(email);

          usersMap.set(id, {
            id,
            name,
            email,
            phone: curr.user_metadata?.phone || "—",
            balance: liveBal,
            frozen_balance: 20.0,
            total_deposit: 0,
            total_withdraw: 0,
            created_at: curr.created_at || new Date().toISOString(),
            status: isBlocked ? "blocked" : "active",
            role: "user",
            referred_by: referredBy,
            invite_code: inviteCode,
          });
        }
      }
    }
  } catch {}

  // 3. Compute actual total deposits and withdrawals for each user from real logs
  const deposits = getAdminDeposits();
  const withdrawals = getAdminWithdrawals();

  deposits.forEach(d => {
    if (d.status === "completed" && usersMap.has(d.user_id)) {
      const u = usersMap.get(d.user_id)!;
      u.total_deposit = Number((u.total_deposit + d.amount).toFixed(2));
    }
  });

  withdrawals.forEach(w => {
    if (w.status === "approved" && usersMap.has(w.user_id)) {
      const u = usersMap.get(w.user_id)!;
      u.total_withdraw = Number((u.total_withdraw + w.amount).toFixed(2));
    }
  });

  return Array.from(usersMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function createAdminUser(userData: {
  name: string;
  email: string;
  password?: string;
  balance?: number;
  phone?: string;
  invite_code?: string;
  referred_by?: string;
}): Promise<AdminUser> {
  const cleanEmail = userData.email.trim().toLowerCase();
  const cleanName = userData.name.trim() || cleanEmail.split("@")[0] || "Registered User";
  const initialBalance = Number(userData.balance || 0);
  const now = new Date().toISOString();
  const userId = "usr_" + Math.random().toString(36).slice(2, 9);
  const inviteCode = userData.invite_code?.trim().toUpperCase() || "VTX" + Math.floor(1000 + Math.random() * 9000);

  const newUser: AdminUser = {
    id: userId,
    name: cleanName,
    email: cleanEmail,
    phone: userData.phone?.trim() || "—",
    balance: initialBalance,
    frozen_balance: 20.0,
    total_deposit: 0,
    total_withdraw: 0,
    created_at: now,
    status: "active",
    role: "user",
    referred_by: userData.referred_by?.trim().toUpperCase() || null,
    invite_code: inviteCode,
  };

  // 1. Save to vx_admin_users
  try {
    const rawAdmin = localStorage.getItem(STORAGE_USERS);
    const list: AdminUser[] = rawAdmin ? JSON.parse(rawAdmin) : [];
    const existingIdx = list.findIndex(u => u.email.toLowerCase() === cleanEmail);
    if (existingIdx >= 0) {
      list[existingIdx] = newUser;
    } else {
      list.unshift(newUser);
    }
    localStorage.setItem(STORAGE_USERS, JSON.stringify(list));
  } catch {}

  // 2. Save to vx-accounts so user can log in with password
  try {
    const rawAcc = localStorage.getItem("vx-accounts");
    const accList = rawAcc ? JSON.parse(rawAcc) : [];
    const accIdx = accList.findIndex((a: any) => a.email?.toLowerCase() === cleanEmail);
    const accRecord = {
      id: userId,
      name: cleanName,
      full_name: cleanName,
      email: cleanEmail,
      password: userData.password || "123456",
      balance: initialBalance,
      created_at: now,
      my_invite_code: inviteCode,
      referred_by: newUser.referred_by,
      user_metadata: {
        full_name: cleanName,
        my_invite_code: inviteCode,
        referred_by: newUser.referred_by,
      },
    };
    if (accIdx >= 0) {
      accList[accIdx] = accRecord;
    } else {
      accList.push(accRecord);
    }
    localStorage.setItem("vx-accounts", JSON.stringify(accList));
  } catch {}

  // 3. Attempt insertion into Supabase
  try {
    await supabase.from("users").insert({
      name: cleanName,
      email: cleanEmail,
      phone: newUser.phone,
      balance: initialBalance,
      total_deposit: 0,
      total_withdraw: 0,
      status: "active",
      role: "user",
      invite_code: inviteCode,
      created_at: now,
    });
  } catch {}

  return newUser;
}

/**
 * Async query that fetches live users from Supabase and merges with local storage.
 * Ensures the admin panel sees users registered on any device with their real names!
 */
export async function fetchAdminUsersAsync(): Promise<AdminUser[]> {
  const localList = getAdminUsers();
  const usersMap = new Map<string, AdminUser>();
  localList.forEach(u => usersMap.set(u.id, u));

  try {
    const { data: dbUsers, error } = await supabase.from("users").select("*");
    if (!error && Array.isArray(dbUsers)) {
      dbUsers.forEach((row: any) => {
        if (!row || (!row.email && !row.id)) return;
        const id = row.id ? String(row.id) : `usr_${row.email}`;
        const name = (
          row.name ||
          row.full_name ||
          row.user_metadata?.full_name ||
          (row.first_name ? `${row.first_name} ${row.last_name || ""}`.trim() : null) ||
          row.email?.split("@")[0] ||
          "Registered User"
        ).trim();

        usersMap.set(id, {
          id,
          name,
          email: row.email,
          phone: row.phone || "—",
          balance: Number(row.balance || 0),
          frozen_balance: Number(row.frozen_balance ?? 20.0),
          total_deposit: Number(row.total_deposit ?? row.total_deposited ?? 0),
          total_withdraw: Number(row.total_withdraw ?? row.total_withdrawn ?? 0),
          created_at: row.created_at || new Date().toISOString(),
          status: row.status === "blocked" ? "blocked" : "active",
          role: row.role || "user",
          referred_by: row.referred_by || null,
          invite_code: row.invite_code || row.referral_code || "VTX8829",
        });
      });
    }
  } catch {}

  const result = Array.from(usersMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  saveAdminUsers(result);
  return result;
}

export function saveAdminUsers(users: AdminUser[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
  } catch {}
}

export function toggleUserStatus(userId: string): AdminUser[] {
  const users = getAdminUsers();
  const blockedSet = getBlockedUserIds();

  const target = users.find(u => u.id === userId);
  if (!target) return users;

  const nextStatus = target.status === "active" ? "blocked" : "active";
  if (nextStatus === "blocked") {
    blockedSet.add(userId);
    if (target.email) blockedSet.add(target.email);
  } else {
    blockedSet.delete(userId);
    if (target.email) blockedSet.delete(target.email);
  }

  saveBlockedUserIds(blockedSet);

  // Sync to vx-accounts
  try {
    const raw = localStorage.getItem("vx-accounts");
    if (raw) {
      const accounts = JSON.parse(raw);
      if (Array.isArray(accounts)) {
        const updated = accounts.map((acc: any) => {
          if (acc.id === userId || acc.email === target.email) {
            return { ...acc, status: nextStatus };
          }
          return acc;
        });
        localStorage.setItem("vx-accounts", JSON.stringify(updated));
      }
    }
  } catch {}

  // Sync to Supabase
  try {
    void supabase.from("users").update({ status: nextStatus }).eq("id", userId);
  } catch {}

  return getAdminUsers();
}

export function adjustUserBalance(userId: string, amountDelta: number, note: string = "Admin Adjustment"): AdminUser[] {
  if (typeof window === "undefined") return [];

  let targetEmail = "";
  let targetName = "Registered User";
  let finalBalance = 0;

  // 1. Update in vx_admin_users
  try {
    const rawAdmin = localStorage.getItem(STORAGE_USERS);
    if (rawAdmin) {
      const list = JSON.parse(rawAdmin);
      if (Array.isArray(list)) {
        const updated = list.map((u: any) => {
          if (u.id === userId || (targetEmail && u.email?.toLowerCase() === targetEmail.toLowerCase())) {
            targetEmail = u.email;
            targetName = u.name || targetName;
            const current = Number(u.balance || 0);
            finalBalance = Math.max(0, Number((current + amountDelta).toFixed(2)));
            return { ...u, balance: finalBalance };
          }
          return u;
        });
        localStorage.setItem(STORAGE_USERS, JSON.stringify(updated));
      }
    }
  } catch {}

  // 2. Update in vx-accounts
  try {
    const raw = localStorage.getItem("vx-accounts");
    if (raw) {
      const accounts = JSON.parse(raw);
      if (Array.isArray(accounts)) {
        const updated = accounts.map((acc: any) => {
          if (acc.id === userId || (targetEmail && acc.email?.toLowerCase() === targetEmail.toLowerCase())) {
            targetEmail = acc.email || targetEmail;
            targetName = acc.name || acc.full_name || targetName;
            const current = Number(acc.balance || 0);
            finalBalance = Math.max(0, Number((current + amountDelta).toFixed(2)));
            return { ...acc, balance: finalBalance };
          }
          return acc;
        });
        localStorage.setItem("vx-accounts", JSON.stringify(updated));
      }
    }
  } catch {}

  // 3. Update if current session user
  try {
    const currRaw = localStorage.getItem("vx-mock-user");
    if (currRaw) {
      const curr = JSON.parse(currRaw);
      if (curr && (curr.id === userId || (targetEmail && curr.email?.toLowerCase() === targetEmail.toLowerCase()))) {
        const rawWallet = localStorage.getItem("vertex-test-account-v2") || localStorage.getItem("vertex-test-account-v1");
        if (rawWallet) {
          const w = JSON.parse(rawWallet);
          w.balance = Math.max(0, Number(w.balance || 0) + amountDelta);
          w.history = w.history || [];
          w.history.unshift({
            id: "adj_" + Date.now(),
            type: amountDelta >= 0 ? "deposit" : "withdraw",
            amount: Math.abs(amountDelta),
            note: note || "Admin wallet balance credit",
            timestamp: new Date().toISOString(),
          });
          localStorage.setItem("vertex-test-account-v2", JSON.stringify(w));
        }
      }
    }
  } catch {}

  // 4. Sync to Supabase users table by email
  try {
    const users = getAdminUsers();
    const u = users.find(x => x.id === userId || (targetEmail && x.email?.toLowerCase() === targetEmail.toLowerCase()));
    if (u && u.email) {
      void supabase.from("users").update({ balance: u.balance }).eq("email", u.email);
    }
  } catch {}

  return getAdminUsers();
}

/**
 * Loads REAL withdrawals only — NO dummy sample records.
 * Reads strictly from user withdrawals in vx-withdrawals and vx_admin_withdrawals.
 */
export function getAdminWithdrawals(): AdminWithdrawal[] {
  if (typeof window === "undefined") return [];

  const withdrawalsMap = new Map<string, AdminWithdrawal>();

  // 1. Read stored admin withdrawals
  try {
    const raw = localStorage.getItem(STORAGE_WITHDRAWALS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((w: any) => {
          if (w && w.id) {
            withdrawalsMap.set(w.id, {
              id: w.id,
              user_id: w.user_id || "usr_client",
              user_name: w.user_name || "Vertex User",
              user_email: w.user_email || "user@vertex.market",
              amount: Number(w.amount || 0),
              network: w.network || "USDT (BEP20)",
              address: w.address || w.account_number || "0x...",
              status: w.status || "pending",
              reject_reason: w.reject_reason,
              created_at: w.created_at || new Date().toISOString(),
              processed_at: w.processed_at,
            });
          }
        });
      }
    }
  } catch {}

  // 2. Read live user client submissions from vx-withdrawals
  try {
    const userWithdrawalsRaw = localStorage.getItem("vx-withdrawals");
    if (userWithdrawalsRaw) {
      const userList = JSON.parse(userWithdrawalsRaw);
      if (Array.isArray(userList)) {
        userList.forEach((w: any) => {
          if (!w || !w.id) return;
          if (!withdrawalsMap.has(w.id)) {
            withdrawalsMap.set(w.id, {
              id: w.id,
              user_id: w.user_id || "usr_client",
              user_name: w.user_name || "Vertex User",
              user_email: w.user_email || "user@vertex.market",
              amount: Number(w.amount || 0),
              network: w.network ? w.network : "USDT (BEP20)",
              address: w.address || w.account_number || "0x...",
              status: w.status || "pending",
              reject_reason: w.reject_reason,
              created_at: w.created_at || new Date().toISOString(),
              processed_at: w.processed_at,
            });
          }
        });
      }
    }
  } catch {}

  return Array.from(withdrawalsMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Async fetch of withdrawals from Supabase database merged with local storage.
 */
export async function fetchAdminWithdrawalsAsync(): Promise<AdminWithdrawal[]> {
  const localList = getAdminWithdrawals();
  const map = new Map<string, AdminWithdrawal>();
  localList.forEach(w => map.set(w.id, w));

  try {
    const { data: dbWithdrawals, error } = await supabase.from("withdrawals").select("*");
    if (!error && Array.isArray(dbWithdrawals)) {
      dbWithdrawals.forEach((row: any) => {
        if (!row || !row.id) return;
        map.set(row.id, {
          id: row.id,
          user_id: row.user_id || "usr_client",
          user_name: row.user_name || "Registered User",
          user_email: row.user_email || "member@vertex.market",
          amount: Number(row.amount || 0),
          network: row.network || "USDT (BEP20)",
          address: row.account_number || row.address || "0x...",
          status: row.status || "pending",
          reject_reason: row.reject_reason,
          created_at: row.created_at || new Date().toISOString(),
          processed_at: row.updated_at,
        });
      });
    }
  } catch {}

  const list = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  saveAdminWithdrawals(list);
  return list;
}

export function saveAdminWithdrawals(withdrawals: AdminWithdrawal[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_WITHDRAWALS, JSON.stringify(withdrawals));
  } catch {}
}

export async function approveWithdrawal(withdrawalId: string): Promise<AdminWithdrawal[]> {
  const list = getAdminWithdrawals();
  const updated = list.map(w => {
    if (w.id === withdrawalId) {
      return {
        ...w,
        status: "approved" as const,
        processed_at: new Date().toISOString(),
      };
    }
    return w;
  });

  saveAdminWithdrawals(updated);

  // Sync to user client side withdrawals
  try {
    const raw = localStorage.getItem("vx-withdrawals");
    if (raw) {
      const userList = JSON.parse(raw);
      if (Array.isArray(userList)) {
        const synced = userList.map((w: any) => (w.id === withdrawalId ? { ...w, status: "approved" } : w));
        localStorage.setItem("vx-withdrawals", JSON.stringify(synced));
      }
    }
  } catch {}

  // Update Supabase
  try {
    await supabase.from("withdrawals").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", withdrawalId);
  } catch {}

  return updated;
}

export async function rejectWithdrawal(withdrawalId: string, reason: string): Promise<AdminWithdrawal[]> {
  const list = getAdminWithdrawals();
  const target = list.find(w => w.id === withdrawalId);
  const updated = list.map(w => {
    if (w.id === withdrawalId) {
      return {
        ...w,
        status: "rejected" as const,
        reject_reason: reason || "Rejected by administrator. Funds refunded to wallet balance.",
        processed_at: new Date().toISOString(),
      };
    }
    return w;
  });

  saveAdminWithdrawals(updated);

  // Refund the amount to user's wallet
  if (target && target.amount > 0) {
    try {
      const { creditTestDeposit } = await import("@/lib/demo-positions");
      creditTestDeposit(target.amount);
    } catch {}

    adjustUserBalance(target.user_id, target.amount, `Withdrawal Refund · #${withdrawalId.slice(-6)}`);
  }

  // Sync to user's local withdrawals
  try {
    const raw = localStorage.getItem("vx-withdrawals");
    if (raw) {
      const userList = JSON.parse(raw);
      if (Array.isArray(userList)) {
        const synced = userList.map((w: any) =>
          w.id === withdrawalId ? { ...w, status: "rejected", reject_reason: reason } : w
        );
        localStorage.setItem("vx-withdrawals", JSON.stringify(synced));
      }
    }
  } catch {}

  // Call Supabase RPC for atomic refund & reject
  try {
    const { error } = await supabase.rpc("reject_withdrawal_and_refund", {
      p_withdrawal_id: withdrawalId,
      p_reason: reason,
    });
    if (error) {
      await supabase.from("withdrawals").update({
        status: "rejected",
        reject_reason: reason,
        updated_at: new Date().toISOString(),
      }).eq("id", withdrawalId);
    }
  } catch {}

  return updated;
}

/**
 * Loads REAL deposits only — NO dummy sample data.
 */
export function getAdminDeposits(): AdminDeposit[] {
  if (typeof window === "undefined") return [];

  const depositsMap = new Map<string, AdminDeposit>();

  // 1. Read admin deposits
  try {
    const raw = localStorage.getItem(STORAGE_DEPOSITS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((d: any) => {
          if (d && d.id) {
            depositsMap.set(d.id, {
              id: d.id,
              user_id: d.user_id || "usr_client",
              user_name: d.user_name || "Vertex User",
              user_email: d.user_email || "user@vertex.market",
              amount: Number(d.amount || 0),
              network: d.network || "USDT (BEP20)",
              tx_hash: d.tx_hash || "0x...",
              status: d.status || "completed",
              reject_reason: d.reject_reason,
              created_at: d.created_at || new Date().toISOString(),
            });
          }
        });
      }
    }
  } catch {}

  // 2. Read live user submitted deposits from vx-deposit-records
  try {
    const rawRecords = localStorage.getItem("vx-deposit-records");
    if (rawRecords) {
      const records = JSON.parse(rawRecords);
      if (Array.isArray(records)) {
        records.forEach((r: any) => {
          if (!r || !r.id) return;
          if (!depositsMap.has(r.id)) {
            depositsMap.set(r.id, {
              id: r.id,
              user_id: r.user_id || "usr_client",
              user_name: r.user_name || "Vertex Member",
              user_email: r.user_email || "member@vertex.market",
              amount: Number(r.detected_amount || r.expected_amount || 0),
              network: r.network ? `USDT (${String(r.network).toUpperCase()})` : "USDT (BEP20)",
              tx_hash: r.tx_hash || "0x...",
              status: r.status === "review" ? "pending" : r.status === "rejected" ? "rejected" : "completed",
              created_at: r.created_at || new Date().toISOString(),
            });
          }
        });
      }
    }
  } catch {}

  return Array.from(depositsMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Async fetch of deposits from Supabase database merged with local storage.
 */
export async function fetchAdminDepositsAsync(): Promise<AdminDeposit[]> {
  const localList = getAdminDeposits();
  const map = new Map<string, AdminDeposit>();
  localList.forEach(d => map.set(d.id, d));

  try {
    const { data: dbDeposits, error } = await supabase.from("deposits").select("*");
    if (!error && Array.isArray(dbDeposits)) {
      dbDeposits.forEach((row: any) => {
        if (!row || !row.id) return;
        map.set(row.id, {
          id: row.id,
          user_id: row.user_id || "usr_client",
          user_name: row.user_name || "Registered Member",
          user_email: row.user_email || "user@vertex.market",
          amount: Number(row.amount || 0),
          network: row.currency ? `USDT (BEP20)` : "USDT (BEP20)",
          tx_hash: row.tx_hash || "0x...",
          status: row.status === "approved" ? "completed" : row.status === "rejected" ? "rejected" : "pending",
          created_at: row.created_at || new Date().toISOString(),
        });
      });
    }
  } catch {}

  const list = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  saveAdminDeposits(list);
  return list;
}

export function saveAdminDeposits(deposits: AdminDeposit[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_DEPOSITS, JSON.stringify(deposits));
  } catch {}
}

export function approveDeposit(depositId: string): AdminDeposit[] {
  const deposits = getAdminDeposits();
  const target = deposits.find(d => d.id === depositId);
  const updated = deposits.map(d => {
    if (d.id === depositId) {
      return { ...d, status: "completed" as const };
    }
    return d;
  });

  saveAdminDeposits(updated);

  // Credit amount to user's wallet
  if (target && target.amount > 0) {
    try {
      const { creditTestDeposit } = require("@/lib/demo-positions");
      creditTestDeposit(target.amount);
    } catch {}

    adjustUserBalance(target.user_id, target.amount, `Recharge Approved · #${depositId.slice(-6)}`);
  }

  // Update in vx-deposit-records
  try {
    const raw = localStorage.getItem("vx-deposit-records");
    if (raw) {
      const records = JSON.parse(raw);
      if (Array.isArray(records)) {
        const synced = records.map((r: any) => (r.id === depositId ? { ...r, status: "confirming" } : r));
        localStorage.setItem("vx-deposit-records", JSON.stringify(synced));
      }
    }
  } catch {}

  // Update in Supabase
  try {
    void supabase.from("deposits").update({ status: "approved" }).eq("id", depositId);
  } catch {}

  return updated;
}

export function rejectDeposit(depositId: string, reason: string): AdminDeposit[] {
  const deposits = getAdminDeposits();
  const updated = deposits.map(d => {
    if (d.id === depositId) {
      return { ...d, status: "rejected" as const, reject_reason: reason };
    }
    return d;
  });

  saveAdminDeposits(updated);

  try {
    const raw = localStorage.getItem("vx-deposit-records");
    if (raw) {
      const records = JSON.parse(raw);
      if (Array.isArray(records)) {
        const synced = records.map((r: any) => (r.id === depositId ? { ...r, status: "rejected" } : r));
        localStorage.setItem("vx-deposit-records", JSON.stringify(synced));
      }
    }
  } catch {}

  try {
    void supabase.from("deposits").update({ status: "rejected" }).eq("id", depositId);
  } catch {}

  return updated;
}

/**
 * Calculates REAL daily volume for the past 7 days based strictly on actual transactions.
 */
export function getWeeklyChartData(daysCount: number = 7): ChartDayData[] {
  const deposits = getAdminDeposits();
  const withdrawals = getAdminWithdrawals();

  const days: ChartDayData[] = [];
  const now = new Date();

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const dayDeposit = deposits
      .filter(dep => dep.status === "completed" && dep.created_at.slice(0, 10) === dateStr)
      .reduce((sum, dep) => sum + dep.amount, 0);

    const dayWithdraw = withdrawals
      .filter(wth => (wth.status === "approved" || wth.status === "pending") && wth.created_at.slice(0, 10) === dateStr)
      .reduce((sum, wth) => sum + wth.amount, 0);

    days.push({
      date: label,
      rawDate: dateStr,
      deposit: Number(dayDeposit.toFixed(2)),
      withdraw: Number(dayWithdraw.toFixed(2)),
    });
  }

  return days;
}

export function getDashboardMetrics() {
  const deposits = getAdminDeposits();
  const withdrawals = getAdminWithdrawals();
  const users = getAdminUsers();

  const todayStr = new Date().toISOString().slice(0, 10);

  const completedDeposits = deposits.filter(d => d.status === "completed");
  const totalDeposit = completedDeposits.reduce((acc, d) => acc + d.amount, 0);

  const todayDeposit = completedDeposits
    .filter(d => d.created_at.slice(0, 10) === todayStr)
    .reduce((acc, d) => acc + d.amount, 0);

  const approvedWithdrawals = withdrawals.filter(w => w.status === "approved");
  const totalWithdraw = approvedWithdrawals.reduce((acc, w) => acc + w.amount, 0);

  const todayWithdraw = approvedWithdrawals
    .filter(w => (w.processed_at?.slice(0, 10) === todayStr || w.created_at.slice(0, 10) === todayStr))
    .reduce((acc, w) => acc + w.amount, 0);

  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending");
  const pendingCount = pendingWithdrawals.length;
  const pendingAmount = pendingWithdrawals.reduce((acc, w) => acc + w.amount, 0);

  const pendingDeposits = deposits.filter(d => d.status === "pending");
  const pendingDepositCount = pendingDeposits.length;

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === "active").length;
  const blockedUsers = users.filter(u => u.status === "blocked").length;

  const netFlow = totalDeposit - totalWithdraw;

  return {
    totalDeposit,
    todayDeposit,
    totalWithdraw,
    todayWithdraw,
    pendingCount,
    pendingAmount,
    pendingDepositCount,
    totalUsers,
    activeUsers,
    blockedUsers,
    netFlow,
  };
}

export function exportDataToCsv(type: "users" | "withdrawals" | "deposits") {
  if (typeof window === "undefined") return;

  let csvContent = "";
  const filename = `vertex_${type}_${new Date().toISOString().slice(0, 10)}.csv`;

  if (type === "users") {
    const users = getAdminUsers();
    csvContent = "ID,Name,Email,Phone,Balance,Frozen AI Fund,Total Deposit,Total Withdraw,Status,Joined Date,Referral Code,Referred By\n";
    users.forEach(u => {
      csvContent += `"${u.id}","${u.name}","${u.email}","${u.phone || ""}","${u.balance}","${u.frozen_balance}","${u.total_deposit}","${u.total_withdraw}","${u.status}","${u.created_at}","${u.invite_code || ""}","${u.referred_by || ""}"\n`;
    });
  } else if (type === "withdrawals") {
    const withdrawals = getAdminWithdrawals();
    csvContent = "ID,User ID,Name,Email,Amount,Network,Address,Status,Reject Reason,Created At,Processed At\n";
    withdrawals.forEach(w => {
      csvContent += `"${w.id}","${w.user_id}","${w.user_name}","${w.user_email}","${w.amount}","${w.network}","${w.address}","${w.status}","${w.reject_reason || ""}","${w.created_at}","${w.processed_at || ""}"\n`;
    });
  } else if (type === "deposits") {
    const deposits = getAdminDeposits();
    csvContent = "ID,User ID,Name,Email,Amount,Network,TX Hash,Status,Created At\n";
    deposits.forEach(d => {
      csvContent += `"${d.id}","${d.user_id}","${d.user_name}","${d.user_email}","${d.amount}","${d.network}","${d.tx_hash}","${d.status}","${d.created_at}"\n`;
    });
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
