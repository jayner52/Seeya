import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }: CookieToSet) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Try getSession first (reads from cookies directly)
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  // Debug logging
  console.log('Middleware - Path:', request.nextUrl.pathname);
  console.log('Middleware - Cookies:', request.cookies.getAll().map(c => c.name));
  console.log('Middleware - Session:', session?.user?.email || 'null');
  if (sessionError) console.log('Middleware - Session Error:', sessionError.message);

  const user = session?.user || null;

  // Protected routes
  const protectedRoutes = ['/trips', '/circle', '/profile'];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from auth pages
  const authRoutes = ['/login', '/signup'];
  const isAuthRoute = authRoutes.some(
    (route) => request.nextUrl.pathname === route
  );

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    const redirect = url.searchParams.get('redirect') || '/trips';
    url.pathname = redirect;
    url.searchParams.delete('redirect');
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
