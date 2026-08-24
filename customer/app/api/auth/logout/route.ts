import { cookies } from 'next/headers';
import { clearAuthCookies } from '@/lib/auth/session';
import { REFRESH_COOKIE } from '@/lib/auth/cookie-names';
import { apiUrl } from '@/lib/api/base-url';

// Logout: revoke the refresh token server-side (best effort), then always drop
// the local cookies. Even if the backend call fails, the session is gone from
// this browser — clearing locally is what actually logs the user out.
export async function POST() {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    try {
      await fetch(apiUrl('/auth/logout'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Network error reaching NestJS — fall through and clear cookies anyway.
    }
  }

  await clearAuthCookies();
  return new Response(null, { status: 204 });
}
