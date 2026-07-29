import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_USER_COOKIE } from '@/lib/auth/cookie-names';

// Pages reachable without a session. Everything else requires one.
const PUBLIC_PATHS = ['/login'];

// Proxy (Next 16's renamed Middleware) runs before every matched request. This
// is an OPTIMISTIC presence check only — it asks "is there a session cookie?"
// and redirects accordingly. It does NOT validate the token; real authorization
// stays with NestJS's guards when a page actually fetches data.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_USER_COOKIE);
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // Already signed in but sitting on /login → send to the dashboard.
  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Not signed in and reaching for a protected page → bounce to /login.
  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything EXCEPT Next internals, static assets, favicon, and /api.
  // /api is excluded so the BFF auth routes (login/refresh/logout) stay
  // reachable while logged out — they do their own cookie checks.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
