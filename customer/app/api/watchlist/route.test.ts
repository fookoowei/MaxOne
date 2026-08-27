import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverApiWithRefresh = vi.fn();
vi.mock('@/lib/api/server', () => ({
  serverApiWithRefresh: (...args: unknown[]) => serverApiWithRefresh(...args),
}));

import { POST } from './route';

beforeEach(() => vi.clearAllMocks());

describe('POST /api/watchlist', () => {
  it('forwards symbol/type', async () => {
    serverApiWithRefresh.mockResolvedValue(new Response(JSON.stringify({ id: 'w1' }), { status: 201 }));
    const req = new Request('http://localhost/api/watchlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ symbol: 'BTC', type: 'crypto' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(serverApiWithRefresh).toHaveBeenCalledWith('/watchlist', expect.objectContaining({ method: 'POST' }));
    const sent = JSON.parse((serverApiWithRefresh.mock.calls[0][1] as RequestInit).body as string);
    expect(sent).toEqual({ symbol: 'BTC', type: 'crypto' });
  });
});
