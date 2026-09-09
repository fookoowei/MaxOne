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
const PUBLIC_PATHS = ['/login', '/signup'];

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
  // no JWT decoding is needed here. NOTE: a navigation and its prefetches can hit this
  // branch in parallel (separate lambdas, no way to single-flight) — the backend's
  // 30s reuse grace makes every one of them a valid sibling refresh (prod bug 2026-09-09).
  if (hasSession && !isPublic && !hasAccess && refreshToken) {
    return refreshAtEdge(request, refreshToken);
  }

  return NextResponse.next();
}

async function refreshAtEdge(
  request: NextRequest,
  refreshToken: string,
): Promise<NextResponse> {
  let res: Response;
  try {
    res = await fetch(apiUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Backend unreachable — a transient fault, not a verdict on the session. Continue
    // without touching cookies; the next request retries the refresh.
    return NextResponse.next();
  }

  if (res.status === 401 || res.status === 403) {
    // Refresh token dead (expired, or a replay revoked its family) → wipe the session
    // so this and future requests cleanly land on /login. Only an explicit rejection
    // ends a session: a 502 while Render restarts used to log people out here.
    const redirect = NextResponse.redirect(new URL('/login', request.url));
    redirect.cookies.delete(ACCESS_COOKIE);
    redirect.cookies.delete(REFRESH_COOKIE);
    redirect.cookies.delete(SESSION_USER_COOKIE);
    return redirect;
  }
  if (!res.ok) return NextResponse.next(); // 5xx: keep the cookies, retry next time

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
  // Static, unauthenticated assets the browser fetches on its own (M18a icons/manifest, the push
  // service worker) must never be redirected to /login — a redirect there returns HTML where the
  // browser expects JSON/JS. (Found by reading the browser console, not the server log.)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|apple-icon.png|icons/|sw.js).*)'],
};
