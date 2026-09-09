import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.API_BASE_URL = 'http://backend.test';
const setAuthCookies = vi.fn();
vi.mock('@/lib/auth/session', () => ({ setAuthCookies: (...a: unknown[]) => setAuthCookies(...a) }));

import { POST } from './route';
import { loginSchema } from '@/lib/schemas/auth';

const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});

function post(body: unknown) {
  return new Request('http://localhost:3300/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/login (BFF)', () => {
  it('forwards every loginSchema field to NestJS and sets cookies', async () => {
    const user = { id: 'u1', email: 'a@b.c', role: 'user' };
    const tokens = { accessToken: 'a', refreshToken: 'r' };
    fetchMock.mockResolvedValue(Response.json({ user, tokens }));

    const res = await POST(post({ email: 'a@b.c', password: 'pw' }));

    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://backend.test/auth/login');
    const sent = JSON.parse(init.body);
    expect(sent).toEqual({ email: 'a@b.c', password: 'pw' });
    expect(Object.keys(sent).sort()).toEqual(Object.keys(loginSchema.shape).sort());
    expect(setAuthCookies).toHaveBeenCalledWith(user, tokens);
  });

  it('passes a 2FA challenge through without setting cookies', async () => {
    fetchMock.mockResolvedValue(Response.json({ requires2fa: true, challengeToken: 'c1' }));
    const res = await POST(post({ email: 'a@b.c', password: 'pw' }));
    expect(await res.json()).toEqual({ requires2fa: true, challengeToken: 'c1' });
    expect(setAuthCookies).not.toHaveBeenCalled();
  });

  it('keeps the message vague on 401 (no email enumeration)', async () => {
    fetchMock.mockResolvedValue(Response.json({ message: 'No such user' }, { status: 401 }));
    const res = await POST(post({ email: 'a@b.c', password: 'pw' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Invalid email or password.' });
  });
});
