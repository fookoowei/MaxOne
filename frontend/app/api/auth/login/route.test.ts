import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.API_BASE_URL = 'http://backend.test';

// Shared fake cookie store behind the mocked next/headers.cookies().
const store = { set: vi.fn(), get: vi.fn(), delete: vi.fn() };
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => store) }));

import { POST } from './route';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  SESSION_USER_COOKIE,
} from '@/lib/auth/cookie-names';

function loginRequest(body: unknown) {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('POST /api/auth/login', () => {
  const user = { id: 'u1', email: 'admin@wallet.local', role: 'super_admin' };
  const tokens = { accessToken: 'a.jwt', refreshToken: 'r-opaque' };

  it('forwards credentials to NestJS, sets all three cookies, returns the user', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ user, tokens }), { status: 200 }),
    );

    const res = await POST(loginRequest({ email: user.email, password: 'ChangeMe123!' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user });

    // hit the backend login endpoint with exactly the credentials
    expect(fetchMock).toHaveBeenCalledWith(
      'http://backend.test/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
    const sentBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sentBody).toEqual({ email: user.email, password: 'ChangeMe123!' });

    // wrote access + refresh + session_user
    expect(store.set).toHaveBeenCalledTimes(3);
    const names = store.set.mock.calls.map((c) => c[0]);
    expect(names).toEqual(
      expect.arrayContaining([ACCESS_COOKIE, REFRESH_COOKIE, SESSION_USER_COOKIE]),
    );
  });

  it('on bad credentials mirrors the backend status and sets no cookies', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 401 }));

    const res = await POST(loginRequest({ email: 'x@y.z', password: 'nope' }));

    expect(res.status).toBe(401);
    expect(store.set).not.toHaveBeenCalled();
  });
});
