import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Generate PKCE verifier and challenge
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return { verifier, challenge };
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get('next') ?? '/trips';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || '';

  // Generate PKCE
  const { verifier, challenge } = generatePKCE();

  // Build callback URL
  const redirectTo = `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`;

  // Build the Google OAuth URL through Supabase
  const authUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
  authUrl.searchParams.set('provider', 'google');
  authUrl.searchParams.set('redirect_to', redirectTo);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  // Create redirect response
  const response = NextResponse.redirect(authUrl.toString());

  // Store PKCE verifier in cookie
  const verifierCookieName = `sb-${projectRef}-auth-token-code-verifier`;
  response.cookies.set(verifierCookieName, verifier, {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 10,
  });

  return response;
}
