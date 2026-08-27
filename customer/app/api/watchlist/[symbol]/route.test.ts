import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverApiWithRefresh = vi.fn();
vi.mock('@/lib/api/server', () => ({
  serverApiWithRefresh: (...args: unknown[]) => serverApiWithRefresh(...args),
}));

import { DELETE } from './route';

beforeEach(() => vi.clearAllMocks());

describe('DELETE /api/watchlist/[symbol]', () => {
  it('forwards the delete and mirrors 204', async () => {
    serverApiWithRefresh.mockResolvedValue(new Response(null, { status: 204 }));
    const res = await DELETE(new Request('http://localhost/api/watchlist/BTC', { method: 'DELETE' }), {
      params: Promise.resolve({ symbol: 'BTC' }),
    });

    expect(res.status).toBe(204);
    expect(serverApiWithRefresh).toHaveBeenCalledWith('/watchlist/BTC', expect.objectContaining({ method: 'DELETE' }));
  });
});
