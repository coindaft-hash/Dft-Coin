// Supabase integration client with real connection + offline demo fallback
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';

function sanitizeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[\r\n\t]/g, '').replace(/^["']|["']$/g, '');
}

function sanitizeUrl(value: unknown): string {
  if (typeof value !== 'string') return 'https://bakbmhcoyaqsktzzglxr.supabase.co';
  let str = value.trim().replace(/[\r\n\t]/g, '').replace(/^["']|["']$/g, '');
  const match = str.match(/https:\/\/[a-zA-Z0-9.-]+\.supabase\.co/);
  if (match) return match[0];
  if (str.includes('](')) str = str.split('](')[0].replace(/^\[/, '');
  return str.trim() || 'https://bakbmhcoyaqsktzzglxr.supabase.co';
}

function sanitizeKey(value: unknown): string {
  if (typeof value !== 'string') return 'sb_publishable_mL4zaWZrRuqk4tyO46bkwA_NegYyYJ_';
  let str = value.trim().replace(/[\r\n\t]/g, '').replace(/^["']|["']$/g, '');
  if (str.includes('](')) str = str.split('](')[0].replace(/^\[/, '');
  return str.trim() || 'sb_publishable_mL4zaWZrRuqk4tyO46bkwA_NegYyYJ_';
}

function isValidHttpUrl(str: string): boolean {
  if (!str) return false;
  try {
    const u = new URL(str);
    return (u.protocol === 'http:' || u.protocol === 'https:') && !str.includes('your-project-id');
  } catch {
    return false;
  }
}

function isValidSupabaseKey(key: string): boolean {
  if (!key || key.length < 20 || key.includes('your-supabase')) return false;
  return /^[\x21-\x7E]+$/.test(key);
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  const cleanKey = sanitizeString(supabaseKey);
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const headers = new Headers();

      if (typeof Request !== 'undefined' && input instanceof Request) {
        try {
          input.headers.forEach((value, name) => {
            if (value != null && name) {
              const cleanVal = String(value).replace(/[\r\n]/g, '').trim();
              if (cleanVal) headers.set(name, cleanVal);
            }
          });
        } catch {}
      }

      if (init?.headers) {
        try {
          if (init.headers instanceof Headers) {
            init.headers.forEach((value, name) => {
              if (value != null && name) {
                const cleanVal = String(value).replace(/[\r\n]/g, '').trim();
                if (cleanVal) headers.set(name, cleanVal);
              }
            });
          } else if (Array.isArray(init.headers)) {
            for (const [name, value] of init.headers) {
              if (name && value != null) {
                const cleanVal = String(value).replace(/[\r\n]/g, '').trim();
                if (cleanVal) headers.set(String(name).trim(), cleanVal);
              }
            }
          } else if (typeof init.headers === 'object') {
            for (const [name, value] of Object.entries(init.headers)) {
              if (name && value != null) {
                const cleanVal = String(value).replace(/[\r\n]/g, '').trim();
                if (cleanVal) headers.set(name.trim(), cleanVal);
              }
            }
          }
        } catch {}
      }

      if (cleanKey) {
        try {
          if (isNewSupabaseApiKey(cleanKey) && headers.get('Authorization') === `Bearer ${cleanKey}`) {
            headers.delete('Authorization');
          }
          headers.set('apikey', cleanKey);
        } catch {}
      }

      return await fetch(input, { ...init, headers });
    } catch {
      return await fetch(input, init);
    }
  };
}

export function purgeAllRegisteredAccounts() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('vx-accounts');
      localStorage.removeItem('vx-mock-user');
      localStorage.removeItem('vx-verification-codes');
      localStorage.removeItem('vx-active-verification-codes');
      localStorage.removeItem('vertex-test-account-v1');
      localStorage.removeItem('vertex-test-account-v2');
      localStorage.removeItem('vx-trial-fund-v1');
      localStorage.removeItem('vx-trial-fund-v2');
      localStorage.removeItem('vx-trial-fund-v3');
      localStorage.removeItem('vx-deposit-records');
      localStorage.removeItem('vx-credited-transfers');
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.startsWith('vx-') || key.startsWith('vertex-'))) {
          if (key !== 'vx-accounts-wiped-v5') {
            localStorage.removeItem(key);
          }
        }
      }
      localStorage.setItem('vx-accounts-wiped-v5', 'true');
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  } catch {}
}

// Auto-purge all previous registered accounts so users can create fresh accounts
if (typeof window !== 'undefined') {
  try {
    if (localStorage.getItem('vx-accounts-wiped-v5') !== 'true') {
      purgeAllRegisteredAccounts();
    }
  } catch {}
}

function createMockSupabaseClient() {
  const listeners = new Set<(event: string, session: any) => void>();

  const getStoredAccounts = (): any[] => {
    try {
      const raw = localStorage.getItem('vx-accounts');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  };

  const saveAccounts = (accounts: any[]) => {
    try {
      localStorage.setItem('vx-accounts', JSON.stringify(accounts));
    } catch {}
  };

  const getStoredUser = () => {
    try {
      const raw = localStorage.getItem('vx-mock-user');
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  };

  const getStoredSession = () => {
    const user = getStoredUser();
    if (!user) return null;
    return {
      access_token: 'mock-token-vtx-' + (user.id || 'demo'),
      token_type: 'bearer',
      user,
    };
  };

  return {
    auth: {
      getSession: async () => ({ data: { session: getStoredSession() }, error: null }),
      getUser: async () => ({ data: { user: getStoredUser() }, error: null }),
      signInWithPassword: async ({ email, password }: any) => {
        const cleanEmail = String(email || '').trim().toLowerCase();
        const accounts = getStoredAccounts();
        const existing = accounts.find((a: any) => a.email?.toLowerCase() === cleanEmail);

        let user: any;
        if (existing) {
          // If account exists, verify password if one was set
          if (existing.password && password && existing.password !== password) {
            return { data: { user: null, session: null }, error: { message: 'Incorrect password.' } };
          }
          user = {
            id: existing.id,
            email: existing.email,
            user_metadata: existing.user_metadata || {},
          };
        } else {
          return {
            data: { user: null, session: null },
            error: { message: 'No account found with this email. Please register first.' },
          };
        }

        try {
          localStorage.setItem('vx-mock-user', JSON.stringify(user));
        } catch {}

        const session = {
          access_token: 'mock-token-vtx-' + user.id,
          token_type: 'bearer',
          user,
        };
        listeners.forEach((fn) => fn('SIGNED_IN', session));
        return { data: { user, session }, error: null };
      },
      signUp: async ({ email, password, options }: any) => {
        const cleanEmail = String(email || '').trim().toLowerCase();
        const accounts = getStoredAccounts();
        const existingIndex = accounts.findIndex((a: any) => a.email?.toLowerCase() === cleanEmail);

        const { generateInviteCodeForSeed, recordReferralSignup } = await import('@/lib/referral-team');
        const userId = 'usr_' + Math.random().toString(36).slice(2, 9);
        const myInviteCode = generateInviteCodeForSeed(`${userId}_${cleanEmail}`);
        const referrerCode = options?.data?.referred_by || options?.data?.invite_code || 'VTX8829';

        const meta = {
          first_name: 'Member',
          full_name: 'Member',
          ...(options?.data || {}),
          my_invite_code: myInviteCode,
          invite_code: myInviteCode,
          referred_by: referrerCode,
        };
        const user = {
          id: userId,
          email: cleanEmail,
          user_metadata: meta,
        };

        const accountRecord = {
          ...user,
          password: password || 'demo',
          created_at: new Date().toISOString(),
          my_invite_code: myInviteCode,
          referred_by: referrerCode,
        };

        if (existingIndex >= 0) {
          accounts[existingIndex] = accountRecord;
        } else {
          accounts.push(accountRecord);
        }
        saveAccounts(accounts);

        // Record referral connection and credit $5 bonus
        recordReferralSignup({
          id: userId,
          email: cleanEmail,
          referrerCode,
          myInviteCode,
        });

        try {
          localStorage.setItem('vx-mock-user', JSON.stringify(user));
        } catch {}

        const session = {
          access_token: 'mock-token-vtx-' + user.id,
          token_type: 'bearer',
          user,
        };
        listeners.forEach((fn) => fn('SIGNED_IN', session));
        return { data: { user, session }, error: null };
      },
      verifyOtp: async () => ({ data: { session: getStoredSession() }, error: null }),
      resend: async () => ({ data: {}, error: null }),
      signOut: async () => {
        try {
          localStorage.removeItem('vx-mock-user');
        } catch {}
        listeners.forEach((fn) => fn('SIGNED_OUT', null));
        return { error: null };
      },
      updateUser: async (updates: any) => {
        const current = getStoredUser() || {};
        const updated = {
          ...current,
          user_metadata: {
            ...(current.user_metadata || {}),
            ...(updates.data || {}),
          },
        };
        try {
          localStorage.setItem('vx-mock-user', JSON.stringify(updated));
        } catch {}

        // Also update stored account
        const accounts = getStoredAccounts();
        const idx = accounts.findIndex((a: any) => a.id === updated.id || a.email === updated.email);
        if (idx >= 0) {
          accounts[idx].user_metadata = updated.user_metadata;
          saveAccounts(accounts);
        }

        listeners.forEach((fn) => fn('USER_UPDATED', { user: updated }));
        return { data: { user: updated }, error: null };
      },
      onAuthStateChange: (callback: any) => {
        listeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => listeners.delete(callback),
            },
          },
        };
      },
      setSession: async (tokens: any) => ({ data: { session: tokens }, error: null }),
    },
    rpc: async (fnName: string, args: any) => {
      if (fnName === 'ensure_my_wallet') {
        const { getAvailableBalance, getFrozenBalance, getTotalBalance } = await import('@/lib/demo-positions');
        return {
          data: {
            available_balance: getAvailableBalance(),
            locked_balance: getFrozenBalance(),
            total_balance: getTotalBalance(),
            total_deposited: 0,
            total_withdrawn: 0,
            currency: 'USDT',
          },
          error: null,
        };
      }
      if (fnName === 'profile_summary') {
        const { getProfileSummaryForUser } = await import('@/lib/referral-team');
        const summary = getProfileSummaryForUser(getStoredUser());
        return {
          data: summary,
          error: null,
        };
      }
      if (fnName === 'ensure_my_invite_code') {
        const { getUserInviteCode } = await import('@/lib/referral-team');
        const code = getUserInviteCode(getStoredUser());
        return { data: code, error: null };
      }
      if (fnName === 'check_invite_code') {
        const { isValidInvitationCode } = await import('@/lib/referral-team');
        return { data: isValidInvitationCode(args?._code), error: null };
      }
      if (fnName === 'my_team_levels') {
        const { getTeamMembersForUser } = await import('@/lib/referral-team');
        const members = getTeamMembersForUser(getStoredUser());
        return {
          data: members,
          error: null,
        };
      }
      if (fnName === 'my_team_withdrawals') {
        const { getTeamWithdrawalsForUser } = await import('@/lib/referral-team');
        const withdrawals = getTeamWithdrawalsForUser(getStoredUser());
        return {
          data: withdrawals,
          error: null,
        };
      }
      if (fnName === 'my_team') {
        const { getTeamMembersForUser } = await import('@/lib/referral-team');
        const members = getTeamMembersForUser(getStoredUser());
        return {
          data: members,
          error: null,
        };
      }
      if (fnName === 'transfer_funds') {
        return { data: { success: true, new_balance: 14920.5 }, error: null };
      }
      if (fnName === 'request_withdrawal') {
        return { data: { success: true }, error: null };
      }
      if (fnName === 'cancel_withdrawal') {
        return { data: { success: true }, error: null };
      }
      if (fnName === 'has_role') {
        return { data: true, error: null };
      }
      if (fnName === 'update_daft_quote') {
        return {
          data: [{ symbol: 'DAFT', price: args?._price || 1.85, baseline_price: 1.8, trend: args?._trend || 'up', updated_at: new Date().toISOString(), version: 2 }],
          error: null,
        };
      }
      return { data: null, error: null };
    },
    from: (table: string) => {
      const mockRows: any[] = [];
      if (table === 'deposit_submissions') {
        mockRows.push(
          { id: 'dep_1', amount: 5000, network: 'TRC20', tx_hash: '0x8fa9...3b1a', status: 'completed', created_at: new Date(Date.now() - 86400000).toISOString() },
          { id: 'dep_2', amount: 2000, network: 'BEP20', tx_hash: '0x3e11...99cb', status: 'completed', created_at: new Date(Date.now() - 86400000 * 3).toISOString() }
        );
      } else if (table === 'withdrawals') {
        mockRows.push(
          { id: 'wth_1', amount: 1500, network: 'TRC20', address: '0x71C...93B', status: 'completed', created_at: new Date(Date.now() - 86400000 * 2).toISOString() }
        );
      } else if (table === 'wallet_transfers') {
        mockRows.push(
          { id: 'trf_1', amount: 300, recipient_email: 'partner@vertex.market', note: 'Weekly profit share', created_at: new Date(Date.now() - 43200000).toISOString() }
        );
      } else if (table === 'wallet_ledger') {
        mockRows.push(
          { id: 'led_1', kind: 'referral_bonus', amount: 45.2, description: 'Level A Referral Bonus', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
          { id: 'led_2', kind: 'referral_bonus', amount: 97.6, description: 'Level B Referral Bonus', created_at: new Date(Date.now() - 3600000 * 5).toISOString() }
        );
      }

      const baseBuilder: any = {
        single: async () => ({ data: mockRows[0] || null, error: null }),
        maybeSingle: async () => ({ data: mockRows[0] || null, error: null }),
        insert: async () => ({ data: mockRows, error: null }),
        update: async () => ({ data: mockRows, error: null }),
        upsert: async () => ({ data: mockRows, error: null }),
        delete: async () => ({ data: mockRows, error: null }),
        then: (resolve: any, reject?: any) => Promise.resolve({ data: mockRows, error: null, count: mockRows.length }).then(resolve, reject),
      };

      const queryBuilder: any = new Proxy(baseBuilder, {
        get(target, prop, receiver) {
          if (prop in target) {
            return Reflect.get(target, prop, receiver);
          }
          return () => queryBuilder;
        },
      });
      return queryBuilder;
    },
    channel: (_name: string) => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
    }),
    removeChannel: () => {},
  };
}

function wrapSupabaseAuth(client: any) {
  const realAuth = client.auth;
  const localListeners = new Set<(event: string, session: any) => void>();

  const getLocalUser = () => {
    try {
      const raw = localStorage.getItem('vx-mock-user');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  };

  const getLocalSession = () => {
    const user = getLocalUser();
    if (!user) return null;
    return {
      access_token: 'vx-session-' + (user.id || 'demo'),
      token_type: 'bearer',
      user,
      expires_in: 3600 * 24 * 30,
      expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
    };
  };

  const wrappedAuth = new Proxy(realAuth, {
    get(target, prop, receiver) {
      if (prop === 'getSession') {
        return async () => {
          try {
            const res = await target.getSession();
            if (res?.data?.session) return res;
          } catch {}
          const localSession = getLocalSession();
          return { data: { session: localSession }, error: null };
        };
      }
      if (prop === 'getUser') {
        return async (jwt?: string) => {
          try {
            const res = await target.getUser(jwt);
            if (res?.data?.user) return res;
          } catch {}
          const localUser = getLocalUser();
          return { data: { user: localUser }, error: null };
        };
      }
      if (prop === 'signOut') {
        return async (options?: any) => {
          try {
            localStorage.removeItem('vx-mock-user');
          } catch {}
          localListeners.forEach((fn) => fn('SIGNED_OUT', null));
          try {
            return await target.signOut(options);
          } catch {
            return { error: null };
          }
        };
      }
      if (prop === 'onAuthStateChange') {
        return (callback: any) => {
          localListeners.add(callback);
          let sub: any = null;
          try {
            sub = target.onAuthStateChange(callback);
          } catch {}
          return {
            data: {
              subscription: {
                unsubscribe: () => {
                  localListeners.delete(callback);
                  if (sub?.data?.subscription?.unsubscribe) {
                    sub.data.subscription.unsubscribe();
                  }
                },
              },
            },
          };
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });

  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === 'auth') return wrappedAuth;
      if (prop === 'rpc') {
        return async (fnName: string, args: any) => {
          try {
            const res = await target.rpc(fnName, args);
            if (!res?.error && res?.data !== null && res?.data !== undefined) {
              return res;
            }
          } catch {}

          if (fnName === 'ensure_my_invite_code') {
            const { getUserInviteCode } = await import('@/lib/referral-team');
            return { data: getUserInviteCode(getLocalUser()), error: null };
          }
          if (fnName === 'check_invite_code') {
            const { isValidInvitationCode } = await import('@/lib/referral-team');
            return { data: isValidInvitationCode(args?._code), error: null };
          }
          if (fnName === 'profile_summary') {
            const { getProfileSummaryForUser } = await import('@/lib/referral-team');
            return { data: getProfileSummaryForUser(getLocalUser()), error: null };
          }
          if (fnName === 'my_team_levels' || fnName === 'my_team') {
            const { getTeamMembersForUser } = await import('@/lib/referral-team');
            return { data: getTeamMembersForUser(getLocalUser()), error: null };
          }
          if (fnName === 'my_team_withdrawals') {
            const { getTeamWithdrawalsForUser } = await import('@/lib/referral-team');
            return { data: getTeamWithdrawalsForUser(getLocalUser()), error: null };
          }
          if (fnName === 'ensure_my_wallet') {
            const { getAvailableBalance, getFrozenBalance, getTotalBalance } = await import('@/lib/demo-positions');
            return {
              data: {
                available_balance: getAvailableBalance(),
                locked_balance: getFrozenBalance(),
                total_balance: getTotalBalance(),
                currency: 'USDT',
              },
              error: null,
            };
          }
          return { data: null, error: null };
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

function createSupabaseClient() {
  const localUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('vx_supabase_url') : undefined;
  const localKey = typeof localStorage !== 'undefined' ? localStorage.getItem('vx_supabase_key') : undefined;

  const rawUrl =
    localUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env?.['VITE_SUPABASE_URL']) ||
    (typeof process !== 'undefined' ? (process.env?.['VITE_SUPABASE_URL'] || process.env?.['SUPABASE_URL']) : undefined) ||
    (typeof window !== 'undefined' ? (window as any).__ENV__?.['VITE_SUPABASE_URL'] : undefined);

  const rawKey =
    localKey ||
    (typeof import.meta !== 'undefined' &&
      (import.meta.env?.['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
        import.meta.env?.['VITE_SUPABASE_ANON_KEY'] ||
        import.meta.env?.['VITE_SUPABASE_KEY'])) ||
    (typeof process !== 'undefined'
      ? (process.env?.['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
          process.env?.['VITE_SUPABASE_ANON_KEY'] ||
          process.env?.['SUPABASE_PUBLISHABLE_KEY'] ||
          process.env?.['SUPABASE_ANON_KEY'])
      : undefined) ||
    (typeof window !== 'undefined'
      ? ((window as any).__ENV__?.['VITE_SUPABASE_PUBLISHABLE_KEY'] || (window as any).__ENV__?.['VITE_SUPABASE_ANON_KEY'])
      : undefined);

  const envUrl = sanitizeUrl(rawUrl);
  const envKey = sanitizeKey(rawKey);

  const isRealUrl = isValidHttpUrl(envUrl);
  const isRealKey = isValidSupabaseKey(envKey);

  if (!isRealUrl || !isRealKey || !envUrl || !envKey) {
    return createMockSupabaseClient() as any;
  }

  try {
    const rawClient = createClient<Database>(envUrl, envKey, {
      global: {
        fetch: createSupabaseFetch(envKey),
      },
      auth: {
        storage: brokeredPreviewStorage(),
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return wrapSupabaseAuth(rawClient) as any;
  } catch {
    return createMockSupabaseClient() as any;
  }
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
