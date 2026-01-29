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

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code_provided`);
  }

  const cookieStore = await cookies();

  // Get Supabase project ref
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || '';

  // Read the PKCE verifier from our cookie
  const verifierCookieName = `sb-${projectRef}-auth-token-code-verifier`;
  const codeVerifier = cookieStore.get(verifierCookieName)?.value;

  if (!codeVerifier) {
    console.error('PKCE verifier not found in cookies');
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('PKCE verifier not found. Please try again.')}`
    );
  }

  // Exchange the code for a session using Supabase's token endpoint directly
  const tokenUrl = `${supabaseUrl}/auth/v1/token?grant_type=pkce`;

  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify({
      auth_code: code,
      code_verifier: codeVerifier,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || tokenData.error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(tokenData.error_description || tokenData.error || 'Token exchange failed')}`
    );
  }

  // Now set the session using Supabase client
  const responseCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookies: { name: string; value: string; options: Record<string, unknown> }[]) {
          cookies.forEach((cookie) => {
            responseCookies.push(cookie);
          });
        },
      },
    }
  );

  // Set the session with the tokens we received
  const { error: setSessionError } = await supabase.auth.setSession({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
  });

  if (setSessionError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(setSessionError.message)}`
    );
  }

  // Create redirect response
  const response = NextResponse.redirect(`${origin}${next}`);

  // Delete the verifier cookie
  response.cookies.set(verifierCookieName, '', {
    path: '/',
    maxAge: 0,
  });

  // Set session cookies - explicitly NOT httpOnly so browser client can read them
  responseCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, {
      ...options,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false, // Browser client needs to read these
    });
  });

  return response;
}
