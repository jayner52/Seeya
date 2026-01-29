import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/trips';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors from provider
  if (error) {
    console.error('OAuth provider error:', error, errorDescription);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (code) {
    const cookieStore = await cookies();

    // Log available cookies for debugging
    const allCookies = cookieStore.getAll();
    console.log('Available cookies at callback:', allCookies.map(c => c.name));

    // Collect cookies to set on response
    const responseCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookies: { name: string; value: string; options: Record<string, unknown> }[]) {
            cookies.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch {
                // Ignore errors
              }
              responseCookies.push({ name, value, options });
            });
          },
        },
      }
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      const response = NextResponse.redirect(`${origin}${next}`);

      // Set session cookies on the redirect response
      responseCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, {
          ...options,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        });
      });

      console.log('Auth successful, setting session cookies:', responseCookies.map(c => c.name));

      return response;
    }

    console.error('Auth callback error:', exchangeError.message);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`);
  }

  return NextResponse.redirect(`${origin}/login?error=no_code_provided`);
}
