import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverApiWithRefresh = vi.fn();
vi.mock('@/lib/api/server', () => ({
  serverApiWithRefresh: (...args: unknown[]) => serverApiWithRefresh(...args),
}));

import { POST } from './route';

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => vi.clearAllMocks());

describe('POST /api/transactions/[id]/approve', () => {
  it('forwards to NestJS approve and returns the updated row', async () => {
    serverApiWithRefresh.mockResolvedValue(
      new Response(JSON.stringify({ id: 't1', status: 'approved' }), { status: 200 }),
    );

    const res = await POST(
      new Request('http://localhost/api/transactions/t1/approve', { method: 'POST' }),
      ctx('t1'),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 't1', status: 'approved' });
    expect(serverApiWithRefresh).toHaveBeenCalledWith(
      '/transactions/t1/approve',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('mirrors a 409 (already reviewed) with no body', async () => {
    serverApiWithRefresh.mockResolvedValue(new Response(null, { status: 409 }));
    const res = await POST(
      new Request('http://localhost/api/transactions/t1/approve', { method: 'POST' }),
      ctx('t1'),
    );
    expect(res.status).toBe(409);
  });
});
