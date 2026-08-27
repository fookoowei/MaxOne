import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverApiWithRefresh = vi.fn();
vi.mock('@/lib/api/server', () => ({
  serverApiWithRefresh: (...args: unknown[]) => serverApiWithRefresh(...args),
}));

import { POST } from './route';

beforeEach(() => vi.clearAllMocks());

describe('POST /api/alerts', () => {
  it('forwards the alert', async () => {
    serverApiWithRefresh.mockResolvedValue(new Response(JSON.stringify({ id: 'a1' }), { status: 201 }));
    const req = new Request('http://localhost/api/alerts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ symbol: 'BTC', type: 'crypto', targetPrice: 80000, direction: 'above' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const sent = JSON.parse((serverApiWithRefresh.mock.calls[0][1] as RequestInit).body as string);
    expect(sent).toEqual({ symbol: 'BTC', type: 'crypto', targetPrice: 80000, direction: 'above' });
  });
});
