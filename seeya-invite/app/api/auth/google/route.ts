import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get('next') ?? '/trips';
  const cookieStore = await cookies();

  // Collect all cookies that need to be set on the response
  const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookies: { name: string; value: string; options: Record<string, unknown> }[]) {
          // Collect cookies to set on the redirect response later
          cookies.forEach((cookie) => {
            cookiesToSet.push(cookie);
            // Also set on cookieStore for immediate availability
            try {
              cookieStore.set(cookie.name, cookie.value, cookie.options);
            } catch {
              // Ignore errors from setting cookies in certain contexts
            }
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.url) {
    const response = NextResponse.redirect(data.url);

    // Set all collected cookies on the redirect response
    // This ensures PKCE code verifier is sent to the browser
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, {
        ...options,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    });

    console.log('Setting cookies for OAuth:', cookiesToSet.map(c => c.name));

    return response;
  }

  return NextResponse.redirect(`${origin}/login?error=no_redirect_url`);
}
