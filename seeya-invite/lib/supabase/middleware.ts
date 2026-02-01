import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Public routes that don't need auth checks
const publicRoutes = ['/invite', '/', '/api'];

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  // Skip auth check for public routes
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isPublicRoute) {
    return response;
  }

  try {
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

    const { data: { session } } = await supabase.auth.getSession();
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
  } catch (error) {
    // Log error but don't block the request
    console.error('Middleware auth error:', error);
    return response;
  }
}
