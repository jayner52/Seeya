import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');
  const next = searchParams.get('next') ?? '/trips';

  if (!accessToken) {
    return NextResponse.redirect(`${origin}/login?error=no_token`);
  }

  // Parse the JWT to get user info (JWT is base64 encoded)
  let user = null;
  try {
    const payload = accessToken.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    user = {
      id: decoded.sub,
      email: decoded.email,
      aud: decoded.aud,
      role: decoded.role,
    };
    console.log('Set session - user from JWT:', user.email);
  } catch (e) {
    console.error('Failed to parse JWT:', e);
  }

  // Calculate expiry (JWT exp is in seconds)
  let expiresAt = Math.floor(Date.now() / 1000) + 3600; // Default 1 hour
  try {
    const payload = accessToken.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    expiresAt = decoded.exp;
  } catch (e) {
    // Use default
  }

  // Create session object in Supabase format
  const session = {
    access_token: accessToken,
    refresh_token: refreshToken || '',
    expires_at: expiresAt,
    expires_in: expiresAt - Math.floor(Date.now() / 1000),
    token_type: 'bearer',
    user: user,
  };

  const sessionJson = JSON.stringify(session);
  console.log('Set session - session JSON length:', sessionJson.length);

  // Get project ref from Supabase URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || '';
  const cookieBaseName = `sb-${projectRef}-auth-token`;

  // Create redirect response
  const response = NextResponse.redirect(`${origin}${next}`);

  // Chunk the session data (Supabase uses ~3180 char chunks)
  const chunkSize = 3180;
  const chunks: string[] = [];

  for (let i = 0; i < sessionJson.length; i += chunkSize) {
    chunks.push(sessionJson.slice(i, i + chunkSize));
  }

  console.log('Set session - creating', chunks.length, 'cookie chunks');

  // Set cookies - IMPORTANT: Clear conflicting cookie types first
  // Supabase checks unchunked cookie FIRST, so we must delete it when using chunks
  if (chunks.length === 1) {
    // Clear any existing chunked cookies (up to 10 chunks)
    for (let i = 0; i < 10; i++) {
      response.cookies.set(`${cookieBaseName}.${i}`, '', {
        path: '/',
        maxAge: 0,
      });
    }
    // Set the unchunked cookie
    response.cookies.set(cookieBaseName, chunks[0], {
      path: '/',
      sameSite: 'lax',
      secure: true,
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  } else {
    // CRITICAL: Delete the unchunked cookie first - it takes precedence over chunks!
    response.cookies.set(cookieBaseName, '', {
      path: '/',
      maxAge: 0,
    });
    // Set the chunked cookies
    chunks.forEach((chunk, index) => {
      response.cookies.set(`${cookieBaseName}.${index}`, chunk, {
        path: '/',
        sameSite: 'lax',
        secure: true,
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
    });
  }

  console.log('Set session - cookies set, redirecting to:', next);

  return response;
}
