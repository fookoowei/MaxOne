import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverApiWithRefresh = vi.fn();
vi.mock('@/lib/api/server', () => ({
  serverApiWithRefresh: (...args: unknown[]) => serverApiWithRefresh(...args),
}));

import { POST } from './route';

beforeEach(() => vi.clearAllMocks());

describe('POST /api/ws-ticket', () => {
  it('forwards to the backend and returns the ticket', async () => {
    serverApiWithRefresh.mockResolvedValue(new Response(JSON.stringify({ ticket: 't.jwt' }), { status: 200 }));
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ticket: 't.jwt' });
    expect(serverApiWithRefresh).toHaveBeenCalledWith('/auth/ws-ticket', expect.objectContaining({ method: 'POST' }));
  });

  it('mirrors a non-OK status', async () => {
    serverApiWithRefresh.mockResolvedValue(new Response(null, { status: 401 }));
    const res = await POST();
    expect(res.status).toBe(401);
  });
});
