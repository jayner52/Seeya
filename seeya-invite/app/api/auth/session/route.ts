import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { access_token, refresh_token } = await request.json();

    if (!access_token) {
      return NextResponse.json({ error: 'No access token' }, { status: 400 });
    }

    const cookieStore = await cookies();

    // Collect cookies to set on response
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
            cookies.forEach((cookie) => {
              cookiesToSet.push(cookie);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token: refresh_token || '',
    });

    if (error) {
      console.error('Session error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Create response and set all cookies explicitly
    const response = NextResponse.json({ success: true, user: data.user?.email });

    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, {
        ...options,
        // Ensure cookies are accessible
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    });

    console.log('Setting session cookies:', cookiesToSet.map(c => c.name));

    return response;
  } catch (err) {
    console.error('Session API error:', err);
    return NextResponse.json({ error: 'Failed to set session' }, { status: 500 });
  }
}
