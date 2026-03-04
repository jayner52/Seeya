import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // createBrowserClient already returns a singleton in the browser
  // (via its internal cachedBrowserClient). No wrapper needed.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
