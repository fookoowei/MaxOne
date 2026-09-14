import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverApiWithRefresh = vi.fn();
vi.mock('@/lib/api/server', () => ({
  serverApiWithRefresh: (...args: unknown[]) => serverApiWithRefresh(...args),
}));

import { GET } from './route';

beforeEach(() => {
  vi.clearAllMocks();
  // A fresh Response per call — a Response body can only be read once, and route.ts reads it
  // via proxy(). mockResolvedValue would hand every call the same already-consumed instance.
  serverApiWithRefresh.mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify({ candles: [{ t: 1, o: 1, h: 1, l: 1, c: 1 }] }), {
        status: 200,
      }),
    ),
  );
});

describe('GET /api/markets/[id]/chart', () => {
  it('forwards id + range, returns the chart', async () => {
    const res = await GET(new Request('http://localhost/api/markets/bitcoin/chart?range=4h'), {
      params: Promise.resolve({ id: 'bitcoin' }),
    });

    expect(res.status).toBe(200);
    expect(serverApiWithRefresh).toHaveBeenCalledWith('/markets/bitcoin/chart?range=4h');
  });

  it('falls back to 1h rather than forwarding an unsupported range', async () => {
    await GET(new Request('http://localhost/api/markets/bitcoin/chart?range=7d'), {
      params: Promise.resolve({ id: 'bitcoin' }),
    });
    expect(serverApiWithRefresh).toHaveBeenCalledWith('/markets/bitcoin/chart?range=1h');
  });
});
