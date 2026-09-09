import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.API_BASE_URL = 'http://backend.test';

// setAuthCookies needs Next's request-scoped cookie store, which vitest has no
// access to — stub it; these tests are about what the BFF forwards, not cookies.
const setAuthCookies = vi.fn();
vi.mock('@/lib/auth/session', () => ({ setAuthCookies: (...a: unknown[]) => setAuthCookies(...a) }));

import { POST } from './route';
import { signupSchema } from '@/lib/schemas/auth';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});

const VALID = { email: 'alice@example.com', handle: 'alice', password: 'password123', firstName: 'A', lastName: 'B' };

function post(body: unknown) {
  return new Request('http://localhost:3300/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/register (BFF)', () => {
  it('forwards every schema field (incl. handle) to NestJS and sets cookies on 201', async () => {
    const user = { id: 'u1', email: 'alice@example.com', role: 'user' };
    const tokens = { accessToken: 'a', refreshToken: 'r' };
    fetchMock.mockResolvedValue(Response.json({ user, tokens }, { status: 201 }));

    const res = await POST(post(VALID));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ user });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://backend.test/auth/register');
    const sent = JSON.parse(init.body);
    expect(sent).toEqual(VALID);
    // Guard against the allow-list drifting from the schema again: every schema key is sent.
    expect(Object.keys(sent).sort()).toEqual(Object.keys(signupSchema.shape).sort());
    expect(setAuthCookies).toHaveBeenCalledWith(user, tokens);
  });

  it('rejects a body that fails the schema without calling NestJS', async () => {
    const noHandle: Partial<typeof VALID> = { ...VALID };
    delete noHandle.handle; // the exact production bug: everything but the handle
    const res = await POST(post(noHandle));

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the API's error envelope (409 handle taken) instead of a generic message", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ statusCode: 409, code: 'CONFLICT', message: 'Handle already taken' }, { status: 409 }),
    );

    const res = await POST(post(VALID));

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'CONFLICT', message: 'Handle already taken' });
    expect(setAuthCookies).not.toHaveBeenCalled();
  });
});
