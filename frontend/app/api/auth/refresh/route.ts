import { cookies } from 'next/headers';
import { refreshAuthCookies, clearAuthCookies } from '@/lib/auth/session';
import { REFRESH_COOKIE } from '@/lib/auth/cookie-names';
import { apiUrl } from '@/lib/api/base-url';

// Silent refresh: swap the refresh cookie for a fresh token pair. The mechanism
// is built now; the auto-call-on-401 fetch wrapper that drives it lands in 6b.
export async function POST() {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return new Response(null, { status: 401 });
  }

  const res = await fetch(apiUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    // Refresh token expired or already rotated (single-use) — wipe the session
    // so the next request cleanly bounces to /login.
    await clearAuthCookies();
    return new Response(null, { status: 401 });
  }

  const tokens = await res.json();
  await refreshAuthCookies(tokens);
  return new Response(null, { status: 204 });
}
