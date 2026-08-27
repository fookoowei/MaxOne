import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverApiWithRefresh = vi.fn();
vi.mock('@/lib/api/server', () => ({
  serverApiWithRefresh: (...args: unknown[]) => serverApiWithRefresh(...args),
}));

import { GET } from './route';

beforeEach(() => vi.clearAllMocks());

describe('GET /api/markets/[id]/chart', () => {
  it('forwards id + days, returns the chart', async () => {
    serverApiWithRefresh.mockResolvedValue(
      new Response(JSON.stringify({ points: [1, 2], labels: ['a', 'b'] }), { status: 200 }),
    );
    const res = await GET(new Request('http://localhost/api/markets/bitcoin/chart?days=30'), {
      params: Promise.resolve({ id: 'bitcoin' }),
    });

    expect(res.status).toBe(200);
    expect(serverApiWithRefresh).toHaveBeenCalledWith('/markets/bitcoin/chart?days=30');
  });
});
