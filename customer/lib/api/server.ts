import { cookies } from 'next/headers';
import { apiUrl } from './base-url';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth/cookie-names';
import { refreshAuthCookies, clearAuthCookies } from '@/lib/auth/session';

// Attach a Bearer token (if given) and call NestJS. Kept separate so the retry can
// pass an explicit, freshly-minted token instead of re-reading the cookie store
// (a cookie set() during a request isn't guaranteed to read back within it).
function callWithToken(path: string, init: RequestInit, token?: string): Promise<Response> {
  return fetch(apiUrl(path), {
    ...init,
    headers: {
      ...init.headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
}

// Read-side. Used inside Server Components, where the Proxy has already refreshed an
// expired token before render — so a 401 here is terminal and the caller redirects
// to /login (a Server Component may read cookies but may not set them, so it can't
// rotate them itself).
export async function serverApi(path: string, init: RequestInit = {}): Promise<Response> {
  const store = await cookies();
  return callWithToken(path, init, store.get(ACCESS_COOKIE)?.value);
}

// Write-side. Used inside BFF Route Handlers, which (unlike Server Components) MAY set
// cookies — so on a 401 we refresh, persist the rotated pair, and retry once.
export async function serverApiWithRefresh(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const first = await serverApi(path, init);
  if (first.status !== 401) return first;

  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return first;

  const refreshed = await fetch(apiUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!refreshed.ok) {
    await clearAuthCookies();
    return first; // still 401 — the caller surfaces it
  }

  const tokens = (await refreshed.json()) as { accessToken: string; refreshToken: string };
  await refreshAuthCookies(tokens);
  return callWithToken(path, init, tokens.accessToken); // explicit fresh token, no re-read
}
