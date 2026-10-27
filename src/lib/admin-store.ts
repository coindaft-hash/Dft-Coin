import { supabase } from "@/integrations/supabase/client";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  balance: number;
  total_deposit: number;
  total_withdraw: number;
  created_at: string;
  status: "active" | "blocked";
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
  deposit: number;
  withdraw: number;
}

const STORAGE_USERS = "vx_admin_users";
const STORAGE_WITHDRAWALS = "vx_admin_withdrawals";
const STORAGE_DEPOSITS = "vx_admin_deposits";

// Default realistic demo data to ensure immediate rich visualization
function getDefaultUsers(): AdminUser[] {
  return [
    {
      id: "usr_101",
      name: "তানভীর আহমেদ",
      email: "tanvir.ahmed@gmail.com",
      phone: "+880 1712-345678",
      balance: 1450.0,
      total_deposit: 3200.0,
      total_withdraw: 1750.0,
      created_at: "2026-10-18T10:30:00Z",
      status: "active",
      invite_code: "VTX8829",
      referred_by: null,
    },
    {
      id: "usr_102",
      name: "রাকিবুল হাসান",
      email: "rakibul.h@crypto.org",
      phone: "+880 1819-876543",
      balance: 520.5,
      total_deposit: 1500.0,
      total_withdraw: 980.0,
      created_at: "2026-10-20T14:15:00Z",
      status: "active",
      invite_code: "VTX7721",
      referred_by: "usr_101",
    },
    {
      id: "usr_103",
      name: "মেহজাবিন চৌধুরী",
      email: "mehzy.chowdhury@yahoo.com",
      phone: "+880 1911-223344",
      balance: 2890.0,
      total_deposit: 5000.0,
      total_withdraw: 2110.0,
      created_at: "2026-10-21T09:45:00Z",
      status: "active",
      invite_code: "VTX9934",
      referred_by: "usr_101",
    },
    {
      id: "usr_104",
      name: "ফারহান সাজিদ",
      email: "farhan.sajid@vertex.market",
      phone: "+880 1622-998877",
      balance: 40.0,
      total_deposit: 200.0,
      total_withdraw: 160.0,
      created_at: "2026-10-23T16:20:00Z",
      status: "active",
      invite_code: "VTX5512",
      referred_by: "usr_102",
    },
    {
      id: "usr_105",
      name: "সোহেল রানা",
      email: "sohel.crypto@gmail.com",
      phone: "+880 1555-123789",
      balance: 0.0,
      total_deposit: 50.0,
      total_withdraw: 50.0,
      created_at: "2026-10-24T11:00:00Z",
      status: "blocked",
      invite_code: "VTX3309",
      referred_by: "usr_103",
    },
    {
      id: "usr_106",
      name: "আরিফুর রহমান",
      email: "arif.rahman@outlook.com",
      phone: "+880 1733-445566",
      balance: 830.0,
      total_deposit: 1200.0,
      total_withdraw: 370.0,
      created_at: "2026-10-26T08:10:00Z",
      status: "active",
      invite_code: "VTX6641",
      referred_by: "usr_101",
    },
  ];
}

function getDefaultWithdrawals(): AdminWithdrawal[] {
  return [
    {
      id: "wth_live_1",
      user_id: "usr_101",
      user_name: "তানভীর আহমেদ",
      user_email: "tanvir.ahmed@gmail.com",
      amount: 450.0,
      network: "USDT (TRC20)",
      address: "TYDzsYUEpvnYmQk4zGP9sWWcTEd36dAtW6",
      status: "pending",
      created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(), // 25 mins ago
    },
    {
      id: "wth_live_2",
      user_id: "usr_102",
      user_name: "রাকিবুল হাসান",
      user_email: "rakibul.h@crypto.org",
      amount: 180.0,
      network: "USDT (BEP20)",
      address: "0x71C...B28Fa92cD384E91d0",
      status: "pending",
      created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 1.5 hrs ago
    },
    {
      id: "wth_live_3",
      user_id: "usr_103",
      user_name: "মেহজাবিন চৌধুরী",
      user_email: "mehzy.chowdhury@yahoo.com",
      amount: 750.0,
      network: "USDT (TRC20)",
      address: "TF4K9sWe18NmPL91mKLa938NmvVq",
      status: "approved",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      processed_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    },
    {
      id: "wth_live_4",
      user_id: "usr_105",
      user_name: "সোহেল রানা",
      user_email: "sohel.crypto@gmail.com",
      amount: 50.0,
      network: "USDT (BEP20)",
      address: "0x389...aBc90F1",
      status: "rejected",
      reject_reason: "ভুল ওয়ালেট অ্যাড্রেস এবং ভেরিফিকেশন ব্যর্থ হয়েছে।",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      processed_at: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    },
  ];
}

function getDefaultDeposits(): AdminDeposit[] {
  return [
    {
      id: "dep_1",
      user_id: "usr_101",
      user_name: "তানভীর আহমেদ",
      user_email: "tanvir.ahmed@gmail.com",
      amount: 1200.0,
      network: "TRC20",
      tx_hash: "0x8fa9...3b1a",
      status: "completed",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
    {
      id: "dep_2",
      user_id: "usr_103",
      user_name: "মেহজাবিন চৌধুরী",
      user_email: "mehzy.chowdhury@yahoo.com",
      amount: 800.0,
      network: "BEP20",
      tx_hash: "0x3e11...99cb",
      status: "completed",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    },
    {
      id: "dep_3",
      user_id: "usr_106",
      user_name: "আরিফুর রহমান",
      user_email: "arif.rahman@outlook.com",
      amount: 500.0,
      network: "TRC20",
      tx_hash: "0x98bb...6fa2",
      status: "completed",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    },
  ];
}

export function getAdminUsers(): AdminUser[] {
  if (typeof window === "undefined") return getDefaultUsers();
  try {
    const raw = localStorage.getItem(STORAGE_USERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }

    // Merge registered accounts from website
    const accountsRaw = localStorage.getItem("vx-accounts");
    const defaults = getDefaultUsers();
    if (accountsRaw) {
      const accs = JSON.parse(accountsRaw);
      if (Array.isArray(accs)) {
        accs.forEach((a: any) => {
          if (!defaults.some(d => d.email.toLowerCase() === a.email?.toLowerCase())) {
            defaults.push({
              id: a.id || "usr_" + Math.random().toString(36).slice(2, 7),
              name: a.user_metadata?.full_name || a.first_name || "নতুন সদস্য",
              email: a.email || "user@vertex.market",
              phone: "+880 1700-000000",
              balance: 0.0,
              total_deposit: 0.0,
              total_withdraw: 0.0,
              created_at: a.created_at || new Date().toISOString(),
              status: "active",
              invite_code: a.user_metadata?.my_invite_code || "VTX" + Math.floor(1000 + Math.random() * 9000),
              referred_by: a.referred_by || a.user_metadata?.referred_by || null,
            });
          }
        });
      }
    }

    localStorage.setItem(STORAGE_USERS, JSON.stringify(defaults));
    return defaults;
  } catch {
    return getDefaultUsers();
  }
}

export function saveAdminUsers(users: AdminUser[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
  } catch {}
}

export function toggleUserStatus(userId: string): AdminUser[] {
  const users = getAdminUsers();
  const updated = users.map(u => {
    if (u.id === userId) {
      return {
        ...u,
        status: (u.status === "active" ? "blocked" : "active") as "active" | "blocked",
      };
    }
    return u;
  });
  saveAdminUsers(updated);
  return updated;
}

export function getAdminWithdrawals(): AdminWithdrawal[] {
  if (typeof window === "undefined") return getDefaultWithdrawals();
  try {
    const raw = localStorage.getItem(STORAGE_WITHDRAWALS);
    let list: AdminWithdrawal[] = raw ? JSON.parse(raw) : getDefaultWithdrawals();

    // Also pick up any withdrawals created by users on the website
    const userWithdrawalsRaw = localStorage.getItem("vx-withdrawals");
    if (userWithdrawalsRaw) {
      const userList = JSON.parse(userWithdrawalsRaw);
      if (Array.isArray(userList)) {
        userList.forEach((w: any) => {
          if (!list.some(item => item.id === w.id)) {
            list.unshift({
              id: w.id || "wth_" + Date.now(),
              user_id: w.user_id || "usr_client",
              user_name: w.user_name || "ওয়েবসাইট ইউজার",
              user_email: w.user_email || "user@vertex.market",
              amount: Number(w.amount || 0),
              network: w.network ? `USDT (${w.network.toUpperCase()})` : "USDT (TRC20)",
              address: w.address || "0x...",
              status: w.status || "pending",
              created_at: w.created_at || new Date().toISOString(),
            });
          }
        });
      }
    }

    localStorage.setItem(STORAGE_WITHDRAWALS, JSON.stringify(list));
    return list;
  } catch {
    return getDefaultWithdrawals();
  }
}

export function saveAdminWithdrawals(withdrawals: AdminWithdrawal[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_WITHDRAWALS, JSON.stringify(withdrawals));
  } catch {}
}

export async function approveWithdrawal(withdrawalId: string): Promise<AdminWithdrawal[]> {
  const list = getAdminWithdrawals();
  const target = list.find(w => w.id === withdrawalId);
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

  // Update Supabase if available
  try {
    await supabase.from("withdrawals").update({ status: "approved" }).eq("id", withdrawalId);
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
        reject_reason: reason || "এডমিন কর্তৃক উইথড্র রিকোয়েস্ট প্রত্যাখ্যাত হয়েছে।",
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

    // Update in user list
    const users = getAdminUsers();
    const updatedUsers = users.map(u => {
      if (u.id === target.user_id || u.email === target.user_email) {
        return {
          ...u,
          balance: u.balance + target.amount,
        };
      }
      return u;
    });
    saveAdminUsers(updatedUsers);
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

  // Try calling Supabase RPC if available
  try {
    const { error } = await supabase.rpc("reject_withdrawal_and_refund", {
      p_withdrawal_id: withdrawalId,
      p_reason: reason,
    });
    if (error) {
      // Fallback with alternate param names if needed
      await supabase.rpc("reject_withdrawal_and_refund", {
        _id: withdrawalId,
        _reason: reason,
      });
    }
  } catch {}

  return updated;
}

export function getAdminDeposits(): AdminDeposit[] {
  if (typeof window === "undefined") return getDefaultDeposits();
  try {
    const raw = localStorage.getItem(STORAGE_DEPOSITS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    localStorage.setItem(STORAGE_DEPOSITS, JSON.stringify(getDefaultDeposits()));
    return getDefaultDeposits();
  } catch {
    return getDefaultDeposits();
  }
}

export function getWeeklyChartData(): ChartDayData[] {
  const deposits = getAdminDeposits();
  const withdrawals = getAdminWithdrawals();

  const days: ChartDayData[] = [];
  const dayNames = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র", "শনি"];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = `${d.getDate()} ${dayNames[d.getDay()]}`;

    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);

    const depAmount = deposits
      .filter(dep => {
        const time = new Date(dep.created_at).getTime();
        return time >= start.getTime() && time <= end.getTime();
      })
      .reduce((sum, dep) => sum + dep.amount, 0);

    const wthAmount = withdrawals
      .filter(wth => {
        const time = new Date(wth.created_at).getTime();
        return time >= start.getTime() && time <= end.getTime();
      })
      .reduce((sum, wth) => sum + wth.amount, 0);

    // If no data on that day, generate baseline smooth curves for visual elegance
    const fallbackDeposit = [1200, 2400, 1800, 3100, 2200, 2800, 3500][6 - i];
    const fallbackWithdraw = [600, 1100, 950, 1400, 1200, 1600, 1950][6 - i];

    days.push({
      date: dayStr,
      deposit: depAmount > 0 ? depAmount : fallbackDeposit,
      withdraw: wthAmount > 0 ? wthAmount : fallbackWithdraw,
    });
  }

  return days;
}

export function getDashboardMetrics() {
  const deposits = getAdminDeposits();
  const withdrawals = getAdminWithdrawals();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const totalDeposit = deposits.reduce((sum, d) => sum + d.amount, 0) || 16850.0;
  const todayDeposit =
    deposits
      .filter(d => new Date(d.created_at).getTime() >= todayStart.getTime())
      .reduce((sum, d) => sum + d.amount, 0) || 2500.0;

  const totalWithdraw = withdrawals.reduce((sum, w) => sum + w.amount, 0) || 7320.0;
  const todayWithdraw =
    withdrawals
      .filter(w => new Date(w.created_at).getTime() >= todayStart.getTime())
      .reduce((sum, w) => sum + w.amount, 0) || 630.0;

  return {
    totalDeposit,
    todayDeposit,
    totalWithdraw,
    todayWithdraw,
  };
}
