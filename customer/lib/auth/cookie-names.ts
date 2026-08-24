// Names of the three httpOnly cookies the BFF owns. The browser never reads
// these via JS (httpOnly) — they exist only to travel back to the Next server.
export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
export const SESSION_USER_COOKIE = 'session_user';

// Cookie lifespans, in seconds, matched to the backend token TTLs so an expired
// session cookie disappears at the same moment its token stops working.
export const ACCESS_MAX_AGE = 60 * 15; //  15 minutes — matches the access JWT
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 7; // 7 days — matches the refresh token

// Non-sensitive identity mirrored into session_user so server components can
// render the role-aware shell without calling /auth/me during render.
export interface SessionUser {
  id: string;
  email: string;
  role: string;
  // Enriched at login/register so the app can greet the customer by name and show their
  // @handle without an extra round-trip. Optional so an older cookie never breaks a render.
  firstName?: string;
  lastName?: string;
  handle?: string;
}

// The security bundle every auth cookie shares. httpOnly keeps it out of JS
// (XSS can't read it); secure only in prod so http://localhost dev still works;
// sameSite 'lax' blocks CSRF on cross-site POSTs while allowing top-level nav.
export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
