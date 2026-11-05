// Server-side Supabase client with service role key - bypasses RLS.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createSupabaseAdminClient() {
  const SUPABASE_URL = typeof process !== 'undefined' ? process.env['SUPABASE_URL'] : undefined;
  const SUPABASE_SERVICE_ROLE_KEY = typeof process !== 'undefined' ? process.env['SUPABASE_SERVICE_ROLE_KEY'] : undefined;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const createMockBuilder = () => {
      const baseBuilder: any = {
        single: async () => ({ data: null, error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
        insert: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        upsert: async () => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null }),
        then: (resolve: any, reject?: any) => Promise.resolve({ data: [], error: null, count: 0 }).then(resolve, reject),
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
    };

    const mockAdmin: any = {
      from: () => createMockBuilder(),
      rpc: async () => ({ data: [], error: null }),
    };
    return mockAdmin;
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_SERVICE_ROLE_KEY),
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
