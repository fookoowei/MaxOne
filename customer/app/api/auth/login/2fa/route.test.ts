import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.API_BASE_URL = 'http://backend.test';
const setAuthCookies = vi.fn();
vi.mock('@/lib/auth/session', () => ({ setAuthCookies: (...a: unknown[]) => setAuthCookies(...a) }));

import { POST } from './route';

const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});

function post(body: unknown) {
  return new Request('http://localhost:3300/api/auth/login/2fa', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/login/2fa (BFF)', () => {
  it('forwards challengeToken + code and sets cookies', async () => {
    const user = { id: 'u1', email: 'a@b.c', role: 'user' };
    const tokens = { accessToken: 'a', refreshToken: 'r' };
    fetchMock.mockResolvedValue(Response.json({ user, tokens }));

    const res = await POST(post({ challengeToken: 'c1', code: '123456' }));

    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://backend.test/auth/login/2fa');
    expect(JSON.parse(init.body)).toEqual({ challengeToken: 'c1', code: '123456' });
    expect(setAuthCookies).toHaveBeenCalledWith(user, tokens);
  });

  it('mirrors the API status with a friendly message on failure', async () => {
    fetchMock.mockResolvedValue(Response.json({ message: 'bad' }, { status: 401 }));
    const res = await POST(post({ challengeToken: 'c1', code: '000000' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Invalid or expired code.' });
    expect(setAuthCookies).not.toHaveBeenCalled();
  });
});
