import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.API_BASE_URL = 'http://backend.test';

const store = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => store) }));

import { serverApi, serverApiWithRefresh } from './server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth/cookie-names';

// store.get(name) → { value } | undefined
function cookieValues(map: Record<string, string>) {
  store.get.mockImplementation((name: string) => (map[name] ? { value: map[name] } : undefined));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('serverApi', () => {
  it('attaches the Bearer access token and calls the NestJS path', async () => {
    cookieValues({ [ACCESS_COOKIE]: 'a.jwt' });
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('[]', { status: 200 }));

    const res = await serverApi('/transactions/pending');

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://backend.test/transactions/pending',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer a.jwt' }),
      }),
    );
  });
});

describe('serverApiWithRefresh', () => {
  it('on 401 refreshes, rotates cookies, and retries once with the new token', async () => {
    cookieValues({ [ACCESS_COOKIE]: 'stale.jwt', [REFRESH_COOKIE]: 'r-opaque' });
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 401 })) // first call: expired
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: 'fresh.jwt', refreshToken: 'r2' }), { status: 200 }),
      ) // refresh
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 })); // retry

    const res = await serverApiWithRefresh('/transactions/x/approve', { method: 'POST' });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    // retry carried the freshly-minted token, not the stale one
    const retryInit = fetchMock.mock.calls[2][1] as RequestInit;
    expect((retryInit.headers as Record<string, string>).authorization).toBe('Bearer fresh.jwt');
  });

  it('when refresh fails, clears cookies and surfaces the 401', async () => {
    cookieValues({ [ACCESS_COOKIE]: 'stale.jwt', [REFRESH_COOKIE]: 'r-opaque' });
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 })); // refresh fails

    const res = await serverApiWithRefresh('/transactions/x/approve', { method: 'POST' });

    expect(res.status).toBe(401);
    expect(store.delete).toHaveBeenCalled(); // clearAuthCookies ran
  });
});
