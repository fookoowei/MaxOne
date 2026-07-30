import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  SESSION_USER_COOKIE,
} from '@/lib/auth/cookie-names';

process.env.API_BASE_URL = 'http://backend.test';

// Build a NextRequest for a path, optionally carrying session/access/refresh cookies.
function req(path: string, opts?: { session?: boolean; access?: boolean; refresh?: boolean }) {
  const parts: string[] = [];
  if (opts?.session) {
    const value = encodeURIComponent(JSON.stringify({ id: 'u1', email: 'a@b.c', role: 'finance' }));
    parts.push(`${SESSION_USER_COOKIE}=${value}`);
  }
  if (opts?.access) parts.push(`${ACCESS_COOKIE}=a.jwt`);
  if (opts?.refresh) parts.push(`${REFRESH_COOKIE}=r-opaque`);
  const headers = new Headers();
  if (parts.length) headers.set('cookie', parts.join('; '));
  return new NextRequest(new URL(`http://localhost:3200${path}`), { headers });
}

describe('proxy auth-presence guard', () => {
  it('redirects an unauthenticated user from a protected page to /login', async () => {
    const res = await proxy(req('/'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3200/login');
  });

  it('lets an unauthenticated user reach /login', async () => {
    const res = await proxy(req('/login'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('lets an authenticated user reach a protected page', async () => {
    const res = await proxy(req('/', { session: true, access: true }));
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects an authenticated user away from /login to the dashboard', async () => {
    const res = await proxy(req('/login', { session: true }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3200/');
  });
});

beforeEach(() => vi.restoreAllMocks());

describe('proxy edge silent-refresh', () => {
  it('refreshes at the edge when access is gone but refresh remains', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 'new.jwt', refreshToken: 'new-r' }), { status: 200 }),
    );

    const res = await proxy(req('/', { session: true, refresh: true }));

    expect(fetchMock).toHaveBeenCalledWith(
      'http://backend.test/auth/refresh',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(res.headers.get('location')).toBeNull(); // continues, no redirect
    expect(res.cookies.get(ACCESS_COOKIE)?.value).toBe('new.jwt');
    expect(res.cookies.get(REFRESH_COOKIE)?.value).toBe('new-r');
  });

  it('does NOT call the backend when the access token is still present', async () => {
    const fetchMock = vi.spyOn(global, 'fetch');
    const res = await proxy(req('/', { session: true, access: true, refresh: true }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects to /login when refresh fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 401 }));
    const res = await proxy(req('/', { session: true, refresh: true }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3200/login');
    // The response also clears the three cookies; asserting the redirect is the
    // meaningful behavior (delete()'s get() return is not contractual).
  });
});
