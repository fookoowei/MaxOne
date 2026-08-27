import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverApiWithRefresh = vi.fn();
vi.mock('@/lib/api/server', () => ({
  serverApiWithRefresh: (...args: unknown[]) => serverApiWithRefresh(...args),
}));

import { POST } from './route';

beforeEach(() => vi.clearAllMocks());

describe('POST /api/portfolio', () => {
  it('forwards the holding', async () => {
    serverApiWithRefresh.mockResolvedValue(new Response(JSON.stringify({ id: 'h1' }), { status: 201 }));
    const req = new Request('http://localhost/api/portfolio', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ symbol: 'BTC', type: 'crypto', quantity: 0.5, avgCost: 30000 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const sent = JSON.parse((serverApiWithRefresh.mock.calls[0][1] as RequestInit).body as string);
    expect(sent).toEqual({ symbol: 'BTC', type: 'crypto', quantity: 0.5, avgCost: 30000 });
  });
});
