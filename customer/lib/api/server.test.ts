import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.API_BASE_URL = 'http://backend.test';

const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined) }),
}));
const clearAuthCookies = vi.fn();
const refreshAuthCookies = vi.fn();
vi.mock('@/lib/auth/session', () => ({
  clearAuthCookies: () => clearAuthCookies(),
  refreshAuthCookies: (t: unknown) => refreshAuthCookies(t),
}));

import { serverApiWithRefresh } from './server';

const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
  jar.clear();
  jar.set('access_token', 'old.jwt');
  jar.set('refresh_token', 'r-old');
});

describe('serverApiWithRefresh', () => {
  it('on 401 refreshes once, persists the new pair and retries with the fresh token', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ accessToken: 'new.jwt', refreshToken: 'r-new' }, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ ok: true }));

    const res = await serverApiWithRefresh('/thing', { method: 'POST' });

    expect(res.status).toBe(200);
    expect(refreshAuthCookies).toHaveBeenCalledWith({ accessToken: 'new.jwt', refreshToken: 'r-new' });
    const retryHeaders = fetchMock.mock.calls[2][1].headers as Record<string, string>;
    expect(retryHeaders.authorization).toBe('Bearer new.jwt');
    expect(clearAuthCookies).not.toHaveBeenCalled();
  });

  it('clears the session only when the refresh is explicitly rejected (401)', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));

    const res = await serverApiWithRefresh('/thing');

    expect(res.status).toBe(401);
    expect(clearAuthCookies).toHaveBeenCalledTimes(1);
  });

  it('keeps the session when the refresh call hits a 502 or a network error', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response('Bad Gateway', { status: 502 }));
    expect((await serverApiWithRefresh('/thing')).status).toBe(401);

    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockRejectedValueOnce(new Error('ECONNRESET'));
    expect((await serverApiWithRefresh('/thing')).status).toBe(401);

    expect(clearAuthCookies).not.toHaveBeenCalled();
    expect(refreshAuthCookies).not.toHaveBeenCalled();
  });
});
