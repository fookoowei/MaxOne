import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverApiWithRefresh = vi.fn();
vi.mock('@/lib/api/server', () => ({
  serverApiWithRefresh: (...args: unknown[]) => serverApiWithRefresh(...args),
}));

import { GET } from './route';

beforeEach(() => vi.clearAllMocks());

describe('GET /api/rates/quote', () => {
  it('forwards from/to/amount and returns the quote', async () => {
    serverApiWithRefresh.mockResolvedValue(
      new Response(JSON.stringify({ converted: 43890, rate: '0.87781' }), { status: 200 }),
    );
    const res = await GET(new Request('http://localhost/api/rates/quote?from=USD&to=EUR&amount=50000'));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ converted: 43890 });
    expect(serverApiWithRefresh).toHaveBeenCalledWith('/rates/quote?from=USD&to=EUR&amount=50000');
  });

  it('mirrors a 503 (unknown pair)', async () => {
    serverApiWithRefresh.mockResolvedValue(new Response(null, { status: 503 }));
    const res = await GET(new Request('http://localhost/api/rates/quote?from=USD&to=ZZZ&amount=100'));
    expect(res.status).toBe(503);
  });
});
