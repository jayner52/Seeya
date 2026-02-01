import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - .well-known (universal links)
     * - api (API routes - handled separately)
     * - invite (public invite pages)
     */
    '/((?!_next/static|_next/image|favicon.ico|.well-known|api|invite).*)',
  ],
};
