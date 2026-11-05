import { getAvailableBalance, getFrozenBalance, getTotalBalance } from "./demo-positions";
import { supabase } from "@/integrations/supabase/client";

export type TeamMemberRow = {
  user_id: string;
  member: string;
  joined_at: string;
  code: string;
  team_level: number;
  funded: boolean;
  effective_amount: number;
  reward: number;
  today_reward: number;
};

export type TeamWithdrawalRow = {
  id: string;
  member: string;
  team_level: number;
  network: string;
  amount: number;
  status: string;
  created_at: string;
};

const CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const SYSTEM_INVITE_CODES = ["VTX8829", "VERTEX", "VIP888", "ADMIN", "VTX2026", "VTX777"];

// In-memory cache for fast instant renders
const _teamCache = new Map<string, TeamMemberRow[]>();

export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "Member";
  const [user, domain] = email.split("@");
  if (!user || !domain) return "Member";
  const visible = user.length > 2 ? user.slice(0, 3) : user.slice(0, 1);
  return `${visible}***@${domain}`;
}

/**
 * Deterministically generates a unique 7-8 char invite code prefixed with VTX
 * derived from a unique string (userId, email, or uuid).
 */
export function generateInviteCodeForSeed(seed: string): string {
  if (!seed) seed = Math.random().toString(36);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  hash = Math.abs(hash);

  let res = "VTX";
  for (let i = 0; i < 5; i++) {
    const idx = (hash + i * 17) % CODE_CHARS.length;
    res += CODE_CHARS[idx];
    hash = Math.floor(hash / 7) + 31;
  }
  return res;
}

/**
 * Gets or creates the unique invitation code for a given user.
 * Guarantees every user has their own distinct code that stays stable for their account.
 */
export function getUserInviteCode(user?: {
  id?: string;
  email?: string;
  user_metadata?: any;
  inviteCode?: string;
  invite_code?: string;
  my_invite_code?: string;
} | null): string {
  if (typeof window === "undefined") return "VTX8829";

  // 1. Direct explicit property check
  if (user?.my_invite_code && typeof user.my_invite_code === "string" && user.my_invite_code.length >= 4) {
    return user.my_invite_code.toUpperCase();
  }
  if (user?.inviteCode && typeof user.inviteCode === "string" && user.inviteCode.length >= 4) {
    return user.inviteCode.toUpperCase();
  }
  if (user?.invite_code && typeof user.invite_code === "string" && user.invite_code.length >= 4) {
    return user.invite_code.toUpperCase();
  }

  let targetId = user?.id;
  let targetEmail = user?.email;
  let metadata = user?.user_metadata;

  // 2. Check metadata
  if (metadata?.my_invite_code && typeof metadata.my_invite_code === "string" && metadata.my_invite_code.length >= 4) {
    return metadata.my_invite_code.toUpperCase();
  }
  if (metadata?.invite_code && typeof metadata.invite_code === "string" && metadata.invite_code.length >= 4) {
    return metadata.invite_code.toUpperCase();
  }

  // 3. Check vx-mock-user in localStorage
  try {
    const raw = localStorage.getItem("vx-mock-user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed) {
        targetId = targetId || parsed.id;
        targetEmail = targetEmail || parsed.email;
        metadata = metadata || parsed.user_metadata;

        const codeFromMock =
          parsed.my_invite_code ||
          parsed.invite_code ||
          parsed.user_metadata?.my_invite_code ||
          parsed.user_metadata?.invite_code;

        if (codeFromMock && typeof codeFromMock === "string" && codeFromMock.length >= 4) {
          return codeFromMock.toUpperCase();
        }
      }
    }
  } catch {}

  const primaryKey = targetId || targetEmail || "guest";

  // 4. Check localStorage for previously assigned code
  try {
    const stored = localStorage.getItem(`vx_user_code_${primaryKey}`);
    if (stored) return stored.toUpperCase();
  } catch {}

  // 5. Generate a deterministic unique code for this user
  const newCode = generateInviteCodeForSeed(`${primaryKey}_${targetEmail || ""}`);

  try {
    localStorage.setItem(`vx_user_code_${primaryKey}`, newCode);
    if (targetEmail) {
      localStorage.setItem(`vx_user_code_${targetEmail.toLowerCase()}`, newCode);
    }
    // Register in global lookup mapping
    registerInviteCode(newCode, primaryKey, targetEmail || "");
  } catch {}

  return newCode;
}

/**
 * Returns full referral registration link: https://<domain>/register?invite=<CODE>
 */
export function getReferralLink(code: string): string {
  if (typeof window !== "undefined" && window.location.origin) {
    const origin = window.location.origin;
    if (origin.includes("vercel.app") || origin.includes("vertex") || origin.includes("run.app") || origin.includes("localhost")) {
      return `${origin}/register?invite=${encodeURIComponent(code)}`;
    }
  }
  return `https://vertex-market.vercel.app/register?invite=${encodeURIComponent(code)}`;
}

/**
 * Registers an invite code mapping in global client storage
 */
export function registerInviteCode(code: string, userId: string, email: string) {
  if (typeof window === "undefined") return;
  try {
    const upper = code.trim().toUpperCase();
    const raw = localStorage.getItem("vx-registered-codes");
    const map = raw ? JSON.parse(raw) : {};
    map[upper] = { userId, email, registeredAt: new Date().toISOString() };
    localStorage.setItem("vx-registered-codes", JSON.stringify(map));
  } catch {}
}

/**
 * Validates if an invitation code is acceptable during registration
 */
export function isValidInvitationCode(code: string): boolean {
  if (!code) return false;
  const upper = code.trim().toUpperCase();
  if (SYSTEM_INVITE_CODES.includes(upper)) return true;

  try {
    // Check registered codes mapping
    const raw = localStorage.getItem("vx-registered-codes");
    if (raw) {
      const map = JSON.parse(raw);
      if (map[upper]) return true;
    }

    // Check registered accounts
    const accRaw = localStorage.getItem("vx-accounts");
    if (accRaw) {
      const accounts = JSON.parse(accRaw);
      if (Array.isArray(accounts)) {
        const found = accounts.some(
          (a: any) =>
            a.user_metadata?.my_invite_code?.toUpperCase() === upper ||
            a.my_invite_code?.toUpperCase() === upper ||
            a.invite_code?.toUpperCase() === upper ||
            getUserInviteCode(a) === upper
        );
        if (found) return true;
      }
    }
  } catch {}

  // If code is in standard format (>= 4 chars alphanumeric), permit it
  return upper.length >= 4 && /^[A-Z0-9_-]+$/.test(upper);
}

/**
 * Synchronizes a user account to Supabase database.
 * Gracefully handles UUID vs TEXT mismatch on referred_by.
 */
export async function syncUserToSupabase(user: {
  id?: string;
  name: string;
  email: string;
  invite_code?: string;
  referred_by?: string | null;
  balance?: number;
  created_at?: string;
}) {
  const cleanEmail = user.email.trim().toLowerCase();
  const cleanName = user.name.trim();
  const inviteCode = (user.invite_code || "VTX8829").trim().toUpperCase();
  const refCode = user.referred_by ? user.referred_by.trim().toUpperCase() : null;
  const now = user.created_at || new Date().toISOString();

  const payload: any = {
    name: cleanName,
    email: cleanEmail,
    balance: user.balance || 0,
    status: "active",
    role: "user",
    invite_code: inviteCode,
    created_at: now,
  };

  if (refCode) {
    payload.referred_by = refCode;
  }

  try {
    const { error } = await supabase.from("users").upsert(payload, { onConflict: "email" });
    if (!error) return true;

    // If PostgreSQL throws 22P02 because referred_by is UUID in database schema
    if (error.code === "22P02" && refCode) {
      try {
        const { data: inviter } = await supabase.from("users").select("id").eq("invite_code", refCode).maybeSingle();
        if (inviter && (inviter as any).id) {
          payload.referred_by = (inviter as any).id;
          const { error: err2 } = await supabase.from("users").upsert(payload, { onConflict: "email" });
          if (!err2) return true;
        }
      } catch {}
      // If still fails with UUID, remove referred_by from payload so user registration still succeeds
      delete payload.referred_by;
      await supabase.from("users").upsert(payload, { onConflict: "email" });
    }
  } catch {}
}

export const RECHARGE_COMMISSION_RATES: Record<number, { percent: number; label: string; rate: number }> = {
  1: { percent: 5, label: "Level A (Direct)", rate: 0.05 },
  2: { percent: 3, label: "Level B (2nd Tier)", rate: 0.03 },
  3: { percent: 2, label: "Level C (3rd Tier)", rate: 0.02 },
  4: { percent: 1, label: "Level D (4th Tier)", rate: 0.01 },
};

/**
 * Records a new member joining under a referrer's invite code.
 * Initializes the member in the team tree (commission is earned when member recharges).
 */
export function recordReferralSignup(newUser: {
  id: string;
  email: string;
  referrerCode: string;
  myInviteCode: string;
}) {
  if (typeof window === "undefined") return;
  try {
    const trimmedCode = newUser.referrerCode.trim().toUpperCase();
    const teamMemberRecord: TeamMemberRow = {
      user_id: newUser.id,
      member: maskEmail(newUser.email),
      joined_at: new Date().toISOString(),
      code: newUser.myInviteCode,
      team_level: 1, // Direct invite (Level A)
      funded: false,
      effective_amount: 0,
      reward: 0, // Commission awarded upon recharge (5%)
      today_reward: 0,
    };

    // 1. Store under referrer code
    const key = `vx_team_code_${trimmedCode}`;
    const raw = localStorage.getItem(key);
    const list: TeamMemberRow[] = raw ? JSON.parse(raw) : [];
    if (!list.some(m => m.user_id === newUser.id || m.member === teamMemberRecord.member)) {
      list.unshift(teamMemberRecord);
      localStorage.setItem(key, JSON.stringify(list));
    }

    // 2. Also register in global vx_team_all_signups
    const allKey = "vx_team_all_signups";
    const rawAll = localStorage.getItem(allKey);
    const allList = rawAll ? JSON.parse(rawAll) : [];
    if (!allList.some((m: any) => m.id === newUser.id || m.email === newUser.email)) {
      allList.unshift({
        id: newUser.id,
        email: newUser.email,
        invite_code: newUser.myInviteCode,
        referred_by: trimmedCode,
        created_at: teamMemberRecord.joined_at,
      });
      localStorage.setItem(allKey, JSON.stringify(allList));
    }
  } catch {}
}

/**
 * Distributes multi-tier referral commissions whenever a team member recharges:
 * Level 1 (Level A): 5%
 * Level 2 (Level B): 3%
 * Level 3 (Level C): 2%
 * Level 4 (Level D): 1%
 */
export function creditRechargeCommission(
  depositor: { id?: string; email?: string; name?: string },
  rechargeAmount: number
) {
  if (typeof window === "undefined" || !rechargeAmount || rechargeAmount <= 0) return;

  try {
    let allUsers: any[] = [];
    const rawAdmin = localStorage.getItem("vx_admin_users");
    if (rawAdmin) {
      const parsed = JSON.parse(rawAdmin);
      if (Array.isArray(parsed)) allUsers = parsed;
    }
    if (allUsers.length === 0) {
      const rawAccounts = localStorage.getItem("vx-accounts");
      if (rawAccounts) {
        const parsed = JSON.parse(rawAccounts);
        if (Array.isArray(parsed)) allUsers = parsed;
      }
    }

    const depositorEmail = depositor.email?.toLowerCase();
    const member = allUsers.find(
      u => (depositor.id && u.id === depositor.id) || (depositorEmail && u.email?.toLowerCase() === depositorEmail)
    );

    if (!member) return;

    let parentRef = (member.referred_by || member.user_metadata?.referred_by || "").trim();
    let currentLevel = 1;

    while (parentRef && currentLevel <= 4) {
      const refUpper = parentRef.toUpperCase();
      const parentUser = allUsers.find(
        u =>
          (u.invite_code && u.invite_code.toUpperCase() === refUpper) ||
          (u.my_invite_code && u.my_invite_code.toUpperCase() === refUpper) ||
          (u.user_metadata?.my_invite_code && u.user_metadata.my_invite_code.toUpperCase() === refUpper) ||
          u.id === parentRef ||
          (u.email && u.email.toLowerCase() === parentRef.toLowerCase())
      );

      if (!parentUser) break;

      const tier = RECHARGE_COMMISSION_RATES[currentLevel];
      const commission = Number((rechargeAmount * tier.rate).toFixed(2));
      const parentCode = (parentUser.invite_code || parentUser.my_invite_code || getUserInviteCode(parentUser)).toUpperCase();
      const levelLetter = String.fromCharCode(64 + currentLevel);

      if (commission > 0 && parentCode) {
        // 1. Record in referral rewards ledger
        const bonusKey = `vx_referral_rewards_${parentCode}`;
        const rawBonus = localStorage.getItem(bonusKey);
        const bonuses = rawBonus ? JSON.parse(rawBonus) : [];
        bonuses.unshift({
          id: `rew_dep_${Date.now()}_L${currentLevel}`,
          amount: commission,
          level: currentLevel,
          rate: tier.percent,
          note: `Level ${levelLetter} (${tier.percent}%) Recharge Commission · Member recharged $${rechargeAmount.toFixed(2)}`,
          created_at: new Date().toISOString(),
        });
        localStorage.setItem(bonusKey, JSON.stringify(bonuses));

        // 2. Credit to parent's balance
        parentUser.balance = Number((Number(parentUser.balance || 0) + commission).toFixed(2));
        localStorage.setItem("vx_admin_users", JSON.stringify(allUsers));

        // If parent user is the active user, update active balance
        const mockRaw = localStorage.getItem("vx-mock-user");
        if (mockRaw) {
          const mock = JSON.parse(mockRaw);
          if (mock.id === parentUser.id || (mock.email && mock.email.toLowerCase() === parentUser.email?.toLowerCase())) {
            mock.balance = parentUser.balance;
            localStorage.setItem("vx-mock-user", JSON.stringify(mock));
            const actRaw = localStorage.getItem("vertex-test-account-v2");
            if (actRaw) {
              const act = JSON.parse(actRaw);
              act.balance = Number((Number(act.balance || 0) + commission).toFixed(2));
              localStorage.setItem("vertex-test-account-v2", JSON.stringify(act));
            }
          }
        }
      }

      parentRef = (parentUser.referred_by || parentUser.user_metadata?.referred_by || "").trim();
      currentLevel++;
    }
  } catch {}
}

/**
 * Tests if child user belongs to a referrer by code, ID, or email
 */
function isReferredBy(child: any, parentCode: string, parentId?: string, parentEmail?: string): boolean {
  if (!parentCode) return false;
  const pCodeUpper = parentCode.trim().toUpperCase();
  const cRef = (child.referred_by || child.user_metadata?.referred_by || "").trim().toUpperCase();
  if (cRef && (cRef === pCodeUpper || cRef === pCodeUpper.replace(/^VTX/, ""))) return true;

  if (parentId && (child.referred_by === parentId || child.user_metadata?.referred_by === parentId)) return true;
  if (parentEmail) {
    const pEmailLower = parentEmail.toLowerCase();
    const cRefLower = (child.referred_by || child.user_metadata?.referred_by || "").toLowerCase();
    if (cRefLower === pEmailLower) return true;
  }
  return false;
}

/**
 * Asynchronously loads team members from Supabase database and local storage.
 * Resolves Level A (Direct), Level B, Level C, and Level D downlines!
 */
export async function fetchTeamMembersAsync(user?: { id?: string; email?: string } | null): Promise<TeamMemberRow[]> {
  if (typeof window === "undefined") return [];

  const myCode = getUserInviteCode(user).toUpperCase();
  const myId = user?.id;
  const myEmail = user?.email?.toLowerCase();

  // Map of all known registered users by email or ID
  const allUsersMap = new Map<string, any>();

  // 1. Read from Supabase users table
  try {
    const { data: dbUsers, error } = await supabase.from("users").select("*");
    if (!error && Array.isArray(dbUsers)) {
      dbUsers.forEach((u: any) => {
        if (!u || !u.email) return;
        const key = u.email.toLowerCase();
        allUsersMap.set(key, {
          id: u.id || `usr_${u.email}`,
          email: u.email,
          name: u.name || u.full_name || u.email.split("@")[0],
          invite_code: u.invite_code || u.referral_code || "",
          referred_by: u.referred_by || null,
          total_deposit: Number(u.total_deposit ?? u.total_deposited ?? 0),
          balance: Number(u.balance || 0),
          created_at: u.created_at || new Date().toISOString(),
        });
      });
    }
  } catch {}

  // 2. Read from local vx-accounts
  try {
    const raw = localStorage.getItem("vx-accounts");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((a: any) => {
          if (!a || !a.email) return;
          const key = a.email.toLowerCase();
          const existing = allUsersMap.get(key) || {};
          allUsersMap.set(key, {
            ...existing,
            id: a.id || existing.id,
            email: a.email,
            name: a.name || a.full_name || existing.name || a.email.split("@")[0],
            invite_code: a.my_invite_code || a.invite_code || a.user_metadata?.my_invite_code || existing.invite_code || "",
            referred_by: a.referred_by || a.user_metadata?.referred_by || existing.referred_by || null,
            total_deposit: Number(a.total_deposit || existing.total_deposit || 0),
            balance: Number(a.balance || existing.balance || 0),
            created_at: a.created_at || existing.created_at || new Date().toISOString(),
          });
        });
      }
    }
  } catch {}

  // 3. Read from local vx_admin_users
  try {
    const rawAdmin = localStorage.getItem("vx_admin_users");
    if (rawAdmin) {
      const parsed = JSON.parse(rawAdmin);
      if (Array.isArray(parsed)) {
        parsed.forEach((u: any) => {
          if (!u || !u.email) return;
          const key = u.email.toLowerCase();
          const existing = allUsersMap.get(key) || {};
          allUsersMap.set(key, {
            ...existing,
            id: u.id || existing.id,
            email: u.email,
            name: u.name || existing.name,
            invite_code: u.invite_code || existing.invite_code || "",
            referred_by: u.referred_by || existing.referred_by || null,
            total_deposit: Number(u.total_deposit || existing.total_deposit || 0),
            balance: Number(u.balance || existing.balance || 0),
            created_at: u.created_at || existing.created_at,
          });
        });
      }
    }
  } catch {}

  // 4. Read from local vx_team_all_signups
  try {
    const rawSignups = localStorage.getItem("vx_team_all_signups");
    if (rawSignups) {
      const parsed = JSON.parse(rawSignups);
      if (Array.isArray(parsed)) {
        parsed.forEach((s: any) => {
          if (!s || !s.email) return;
          const key = s.email.toLowerCase();
          const existing = allUsersMap.get(key) || {};
          allUsersMap.set(key, {
            ...existing,
            id: s.id || existing.id,
            email: s.email,
            invite_code: s.invite_code || existing.invite_code || "",
            referred_by: s.referred_by || existing.referred_by || null,
            created_at: s.created_at || existing.created_at,
          });
        });
      }
    }
  } catch {}

  // Also include any members manually saved in vx_team_code_${myCode}
  try {
    const rawMyTeam = localStorage.getItem(`vx_team_code_${myCode}`);
    if (rawMyTeam) {
      const parsed = JSON.parse(rawMyTeam);
      if (Array.isArray(parsed)) {
        parsed.forEach((m: any) => {
          if (!m || !m.user_id) return;
          const key = `local_${m.user_id}`;
          if (!allUsersMap.has(key)) {
            allUsersMap.set(key, {
              id: m.user_id,
              email: m.member?.includes("@") ? m.member : `member_${m.user_id}@vertex.market`,
              name: m.member || "Member",
              invite_code: m.code || "",
              referred_by: myCode,
              total_deposit: Number(m.effective_amount || 0),
              balance: 0,
              created_at: m.joined_at || new Date().toISOString(),
            });
          }
        });
      }
    }
  } catch {}

  // 5. Aggregate live deposits from Supabase so member total_deposit and recharge rewards are 100% accurate
  try {
    const { data: dbDeposits } = await supabase.from("deposits").select("*");
    if (Array.isArray(dbDeposits)) {
      dbDeposits.forEach((d: any) => {
        if (d && (d.status === "approved" || d.status === "completed" || d.status === "confirming")) {
          const amt = Number(d.amount || 0);
          if (amt > 0) {
            const emailKey = d.user_email ? String(d.user_email).toLowerCase() : null;
            const idKey = d.user_id ? String(d.user_id) : null;
            if (emailKey && allUsersMap.has(emailKey)) {
              const u = allUsersMap.get(emailKey);
              u.total_deposit = (Number(u.total_deposit) || 0) + amt;
            } else if (idKey) {
              for (const u of allUsersMap.values()) {
                if (u.id === idKey) {
                  u.total_deposit = (Number(u.total_deposit) || 0) + amt;
                  break;
                }
              }
            }
          }
        }
      });
    }
  } catch {}

  const allUsersList = Array.from(allUsersMap.values()).filter(
    u => u.email?.toLowerCase() !== myEmail && u.id !== myId
  );

  const todayStr = new Date().toISOString().slice(0, 10);

  // LEVEL 1 (Level A: Direct referrals)
  const level1Users = allUsersList.filter(u => isReferredBy(u, myCode, myId, myEmail));
  const level1Codes = new Set(level1Users.map(u => (u.invite_code || "").toUpperCase()).filter(Boolean));
  const level1Ids = new Set(level1Users.map(u => u.id).filter(Boolean));
  const level1Emails = new Set(level1Users.map(u => u.email?.toLowerCase()).filter(Boolean));

  // LEVEL 2 (Level B: 2 steps away)
  const remainingAfterL1 = allUsersList.filter(u => !level1Ids.has(u.id) && !level1Emails.has(u.email?.toLowerCase()));
  const level2Users = remainingAfterL1.filter(u => {
    const ref = (u.referred_by || "").toUpperCase();
    return (
      (ref && level1Codes.has(ref)) ||
      (u.referred_by && level1Ids.has(u.referred_by)) ||
      (u.referred_by && level1Emails.has(u.referred_by.toLowerCase()))
    );
  });
  const level2Codes = new Set(level2Users.map(u => (u.invite_code || "").toUpperCase()).filter(Boolean));
  const level2Ids = new Set(level2Users.map(u => u.id).filter(Boolean));
  const level2Emails = new Set(level2Users.map(u => u.email?.toLowerCase()).filter(Boolean));

  // LEVEL 3 (Level C: 3 steps away)
  const remainingAfterL2 = remainingAfterL1.filter(u => !level2Ids.has(u.id) && !level2Emails.has(u.email?.toLowerCase()));
  const level3Users = remainingAfterL2.filter(u => {
    const ref = (u.referred_by || "").toUpperCase();
    return (
      (ref && level2Codes.has(ref)) ||
      (u.referred_by && level2Ids.has(u.referred_by)) ||
      (u.referred_by && level2Emails.has(u.referred_by.toLowerCase()))
    );
  });
  const level3Codes = new Set(level3Users.map(u => (u.invite_code || "").toUpperCase()).filter(Boolean));
  const level3Ids = new Set(level3Users.map(u => u.id).filter(Boolean));
  const level3Emails = new Set(level3Users.map(u => u.email?.toLowerCase()).filter(Boolean));

  // LEVEL 4 (Level D: 4 steps away)
  const remainingAfterL3 = remainingAfterL2.filter(u => !level3Ids.has(u.id) && !level3Emails.has(u.email?.toLowerCase()));
  const level4Users = remainingAfterL3.filter(u => {
    const ref = (u.referred_by || "").toUpperCase();
    return (
      (ref && level3Codes.has(ref)) ||
      (u.referred_by && level3Ids.has(u.referred_by)) ||
      (u.referred_by && level3Emails.has(u.referred_by.toLowerCase()))
    );
  });

  const toRow = (u: any, level: number): TeamMemberRow => {
    const joinedAt = u.created_at || new Date().toISOString();
    const isToday = joinedAt.slice(0, 10) === todayStr;
    const effectiveRecharge = Number(u.total_deposit || 0);
    const tier = RECHARGE_COMMISSION_RATES[level] ?? { rate: 0.01, percent: 1 };
    const reward = Number((effectiveRecharge * tier.rate).toFixed(2));
    const funded = effectiveRecharge > 0;
    return {
      user_id: u.id || `usr_${u.email}`,
      member: maskEmail(u.email),
      joined_at: joinedAt,
      code: u.invite_code || "—",
      team_level: level,
      funded,
      effective_amount: effectiveRecharge,
      reward,
      today_reward: isToday ? reward : 0,
    };
  };

  const rows: TeamMemberRow[] = [
    ...level1Users.map(u => toRow(u, 1)),
    ...level2Users.map(u => toRow(u, 2)),
    ...level3Users.map(u => toRow(u, 3)),
    ...level4Users.map(u => toRow(u, 4)),
  ];

  // Cache to memory and localStorage
  _teamCache.set(myCode, rows);

  try {
    localStorage.setItem(`vx_team_code_${myCode}`, JSON.stringify(rows));
  } catch {}

  return rows;
}

/**
 * Synchronous getter returning cached or local team members immediately
 */
export function getTeamMembersForUser(user?: { id?: string; email?: string } | null): TeamMemberRow[] {
  if (typeof window === "undefined") return [];
  const userCode = getUserInviteCode(user).toUpperCase();
  if (!userCode) return [];

  // 1. Check in-memory cache
  if (_teamCache.has(userCode)) {
    return _teamCache.get(userCode)!;
  }

  // 2. Check localStorage
  try {
    const key = `vx_team_code_${userCode}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }

    // 3. Look up registered accounts matching userCode
    const accRaw = localStorage.getItem("vx-accounts");
    if (accRaw) {
      const accounts = JSON.parse(accRaw);
      if (Array.isArray(accounts)) {
        const matching = accounts.filter(
          (a: any) =>
            a.referred_by?.toUpperCase() === userCode ||
            a.user_metadata?.referred_by?.toUpperCase() === userCode
        );
        if (matching.length > 0) {
          const rows: TeamMemberRow[] = matching.map((a: any) => {
            const dep = Number(a.total_deposit || 0);
            const rew = Number((dep * 0.05).toFixed(2));
            return {
              user_id: a.id || "usr_" + Math.random().toString(36).slice(2, 7),
              member: maskEmail(a.email || "member@vertex.market"),
              joined_at: a.created_at || new Date().toISOString(),
              code: a.my_invite_code || a.invite_code || getUserInviteCode(a),
              team_level: 1,
              funded: dep > 0,
              effective_amount: dep,
              reward: rew,
              today_reward: rew,
            };
          });
          return rows;
        }
      }
    }
  } catch {}

  return [];
}

/**
 * Returns team withdrawals for the given user's team members
 */
export function getTeamWithdrawalsForUser(user?: { id?: string; email?: string } | null): TeamWithdrawalRow[] {
  if (typeof window === "undefined") return [];
  const team = getTeamMembersForUser(user);
  if (team.length === 0) return [];

  const withdrawals: TeamWithdrawalRow[] = [];
  try {
    const raw = localStorage.getItem("vx_team_withdrawals") || localStorage.getItem("vx-withdrawals");
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const memberIds = new Set(team.map(m => m.user_id));
        return list.filter((w: any) => memberIds.has(w.user_id));
      }
    }
  } catch {}
  return withdrawals;
}

/**
 * Asynchronous fetch of team withdrawals from Supabase database
 */
export async function fetchTeamWithdrawalsAsync(user?: { id?: string; email?: string } | null): Promise<TeamWithdrawalRow[]> {
  const team = await fetchTeamMembersAsync(user);
  if (team.length === 0) return [];

  const memberIds = new Set(team.map(m => m.user_id));
  const memberMap = new Map<string, TeamMemberRow>();
  team.forEach(m => memberMap.set(m.user_id, m));

  const list: TeamWithdrawalRow[] = [];

  try {
    const { data: dbWth } = await supabase.from("withdrawals").select("*");
    if (Array.isArray(dbWth)) {
      dbWth.forEach((w: any) => {
        if (w && memberIds.has(w.user_id)) {
          const member = memberMap.get(w.user_id);
          list.push({
            id: w.id,
            member: member?.member || "Team Member",
            team_level: member?.team_level || 1,
            network: w.network || "USDT (BEP20)",
            amount: Number(w.amount || 0),
            status: w.status || "pending",
            created_at: w.created_at || new Date().toISOString(),
          });
        }
      });
    }
  } catch {}

  if (list.length === 0) {
    return getTeamWithdrawalsForUser(user);
  }
  return list;
}

/**
 * Returns total referral recharge commissions for a user
 */
export function getReferralRewardsForUser(user?: { id?: string; email?: string } | null): {
  total: number;
  history: { id: string; amount: number; note: string; created_at: string }[];
} {
  const userCode = getUserInviteCode(user);
  if (!userCode || typeof window === "undefined") return { total: 0, history: [] };

  try {
    const bonusKey = `vx_referral_rewards_${userCode.toUpperCase()}`;
    const raw = localStorage.getItem(bonusKey);
    if (raw) {
      const history = JSON.parse(raw);
      if (Array.isArray(history) && history.length > 0) {
        const total = history.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        return { total: Number(total.toFixed(2)), history };
      }
    }

    const team = getTeamMembersForUser(user);
    if (team.length > 0) {
      const total = team.reduce((sum, item) => sum + (Number(item.reward) || 0), 0);
      const history = team
        .filter(m => (m.reward || 0) > 0)
        .map((m, idx) => {
          const tier = RECHARGE_COMMISSION_RATES[m.team_level] ?? { percent: 5, rate: 0.05 };
          const levelLetter = String.fromCharCode(64 + m.team_level);
          return {
            id: `rew_${idx}_${m.user_id}`,
            amount: m.reward,
            note: `Level ${levelLetter} (${tier.percent}%) Recharge Commission · ${m.member} deposit of $${m.effective_amount.toFixed(2)}`,
            created_at: m.joined_at,
          };
        });
      return { total: Number(total.toFixed(2)), history };
    }
  } catch {}

  return { total: 0, history: [] };
}

/**
 * Profile summary dynamically generated for the current user session
 */
export function getProfileSummaryForUser(user?: { id?: string; email?: string } | null) {
  const available = getAvailableBalance();
  const frozen = getFrozenBalance();
  const total = getTotalBalance();
  const team = getTeamMembersForUser(user);
  const earnings = team.reduce((sum, m) => sum + (Number(m.reward) || 0), 0);

  return {
    balance: available,
    frozen_balance: frozen,
    total_balance: total,
    earnings: Number(earnings.toFixed(2)),
    deposited: 0,
    withdrawn: 0,
    team_count: team.length,
    deposit_count: 0,
    withdrawal_count: 0,
    transfer_count: 0,
    vip_level: 0,
  };
}

