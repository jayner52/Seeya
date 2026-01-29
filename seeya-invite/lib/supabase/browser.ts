import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Browser client for OAuth - uses implicit flow to avoid PKCE storage issues
export function createBrowserClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'implicit',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );
}
