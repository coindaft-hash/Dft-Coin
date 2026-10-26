import { getAvailableBalance, getFrozenBalance, getTotalBalance } from "./demo-positions";

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
export function getUserInviteCode(user?: { id?: string; email?: string; user_metadata?: any } | null): string {
  if (typeof window === "undefined") return "VTX8829";

  let targetId = user?.id;
  let targetEmail = user?.email;
  let metadata = user?.user_metadata;

  if (!targetId && !targetEmail) {
    try {
      const raw = localStorage.getItem("vx-mock-user");
      if (raw) {
        const parsed = JSON.parse(raw);
        targetId = parsed.id;
        targetEmail = parsed.email;
        metadata = parsed.user_metadata;
      }
    } catch {}
  }

  // 1. Check if user metadata already has a dedicated personal invite code
  if (metadata?.my_invite_code && typeof metadata.my_invite_code === "string" && metadata.my_invite_code.length >= 4) {
    return metadata.my_invite_code.toUpperCase();
  }

  const primaryKey = targetId || targetEmail || "guest";

  // 2. Check localStorage for previously assigned code
  try {
    const stored = localStorage.getItem(`vx_user_code_${primaryKey}`);
    if (stored) return stored.toUpperCase();
  } catch {}

  // 3. Generate a deterministic unique code for this user
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
  const origin = typeof window !== "undefined" && window.location.origin
    ? window.location.origin
    : "https://vertex.market";
  return `${origin}/register?invite=${encodeURIComponent(code)}`;
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
 * Records a new member joining under a referrer's invite code.
 * Credits $5.00 referral reward to the referrer and builds the team tree.
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
      team_level: 1, // Direct invite
      funded: false,
      effective_amount: 0,
      reward: 5.0,
      today_reward: 5.0,
    };

    // Store under referrer code
    const key = `vx_team_code_${trimmedCode}`;
    const raw = localStorage.getItem(key);
    const list: TeamMemberRow[] = raw ? JSON.parse(raw) : [];
    if (!list.some(m => m.user_id === newUser.id)) {
      list.unshift(teamMemberRecord);
      localStorage.setItem(key, JSON.stringify(list));
    }

    // Also credit $5 to referrer's bonus ledger
    const bonusKey = `vx_referral_rewards_${trimmedCode}`;
    const rawBonus = localStorage.getItem(bonusKey);
    const bonuses = rawBonus ? JSON.parse(rawBonus) : [];
    bonuses.unshift({
      id: "ref_" + Date.now(),
      amount: 5.0,
      note: `Referral reward · ${maskEmail(newUser.email)} joined Vertex`,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(bonusKey, JSON.stringify(bonuses));
  } catch {}
}

/**
 * Returns team members (Level A, B, C, D) for the given user.
 * Each user sees their own team members based on their invite code and direct signups.
 */
export function getTeamMembersForUser(user?: { id?: string; email?: string } | null): TeamMemberRow[] {
  if (typeof window === "undefined") return [];
  const userCode = getUserInviteCode(user);
  if (!userCode) return [];

  try {
    const key = `vx_team_code_${userCode.toUpperCase()}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }

    // Also look up any accounts registered with referred_by matching this user's code
    const accRaw = localStorage.getItem("vx-accounts");
    if (accRaw) {
      const accounts = JSON.parse(accRaw);
      if (Array.isArray(accounts)) {
        const matching = accounts.filter(
          (a: any) =>
            a.referred_by?.toUpperCase() === userCode.toUpperCase() ||
            a.user_metadata?.invite_code?.toUpperCase() === userCode.toUpperCase()
        );
        if (matching.length > 0) {
          const rows: TeamMemberRow[] = matching.map((a: any) => ({
            user_id: a.id || "usr_" + Math.random().toString(36).slice(2, 7),
            member: maskEmail(a.email || "member@vertex.market"),
            joined_at: a.created_at || new Date().toISOString(),
            code: a.user_metadata?.my_invite_code || getUserInviteCode(a),
            team_level: 1,
            funded: false,
            effective_amount: 0,
            reward: 5.0,
            today_reward: 5.0,
          }));
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

  // Team withdrawals are pulled from actual member actions
  const withdrawals: TeamWithdrawalRow[] = [];
  try {
    const raw = localStorage.getItem("vx_team_withdrawals");
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
 * Returns total referral bonus earnings for a user
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
      if (Array.isArray(history)) {
        const total = history.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        return { total, history };
      }
    }

    const team = getTeamMembersForUser(user);
    if (team.length > 0) {
      const total = team.reduce((sum, item) => sum + (Number(item.reward) || 0), 0);
      const history = team.map((m, idx) => ({
        id: `rew_${idx}_${m.user_id}`,
        amount: m.reward || 5.0,
        note: `Referral reward · ${m.member} joined Vertex`,
        created_at: m.joined_at,
      }));
      return { total, history };
    }
  } catch {}

  return { total: 0, history: [] };
}

/**
 * Profile summary dynamically generated for the current user session
 * Guarantees total balance: $20.00, frozen balance: $20.00, available: $0.00 for new accounts
 */
export function getProfileSummaryForUser(user?: { id?: string; email?: string } | null) {
  const available = getAvailableBalance();
  const frozen = getFrozenBalance();
  const total = getTotalBalance();
  const { total: earnings } = getReferralRewardsForUser(user);
  const team = getTeamMembersForUser(user);

  return {
    balance: available,
    frozen_balance: frozen,
    total_balance: total,
    earnings,
    deposited: 0,
    withdrawn: 0,
    team_count: team.length,
    deposit_count: 0,
    withdrawal_count: 0,
    transfer_count: 0,
    vip_level: 0,
  };
}
