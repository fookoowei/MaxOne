import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  SESSION_USER_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
  cookieOptions,
} from '@/lib/auth/cookie-names';
import { apiUrl } from '@/lib/api/base-url';

// Pages reachable without a session. Everything else requires one.
const PUBLIC_PATHS = ['/login'];

// Proxy (Next 16's renamed Middleware) runs before every matched request, in the
// Node.js runtime. It has two jobs:
//   1. Optimistic presence check — redirect based on whether a session cookie exists.
//      It does NOT validate the token; real authorization stays with NestJS's guards.
//   2. Edge silent-refresh — when the 15-min access cookie has expired but the 7-day
//      refresh cookie is still valid, mint a fresh token pair HERE and set it on the
//      response. This is the one place that (a) runs before every request AND (b) may
//      write cookies, so a Server Component rendering next always sees a valid access
//      token (a Server Component may read cookies but may not set them).
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const hasSession = request.cookies.has(SESSION_USER_COOKIE);
  const hasAccess = request.cookies.has(ACCESS_COOKIE);
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  // Already signed in but sitting on /login → send to the dashboard.
  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Not signed in and reaching for a protected page → bounce to /login.
  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Session present but the access token expired (its 15-min cookie is gone) and a
  // refresh token remains → refresh at the edge. Cookie-gone IS the expiry signal, so
  // no JWT decoding is needed here, and the network call happens at most once per
  // 15-minute window rather than on every request.
  if (hasSession && !isPublic && !hasAccess && refreshToken) {
    return refreshAtEdge(request, refreshToken);
  }

  return NextResponse.next();
}

async function refreshAtEdge(
  request: NextRequest,
  refreshToken: string,
): Promise<NextResponse> {
  const res = await fetch(apiUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    // Refresh token dead (expired or already rotated, single-use) → wipe the session
    // so this and future requests cleanly land on /login.
    const redirect = NextResponse.redirect(new URL('/login', request.url));
    redirect.cookies.delete(ACCESS_COOKIE);
    redirect.cookies.delete(REFRESH_COOKIE);
    redirect.cookies.delete(SESSION_USER_COOKIE);
    return redirect;
  }

  const tokens = (await res.json()) as { accessToken: string; refreshToken: string };
  const response = NextResponse.next();
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, cookieOptions(ACCESS_MAX_AGE));
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(REFRESH_MAX_AGE));
  return response;
}

export const config = {
  // Run on everything EXCEPT Next internals, static assets, favicon, and /api.
  // /api is excluded so the BFF auth routes (login/refresh/logout) stay reachable
  // while logged out — they do their own cookie checks.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
