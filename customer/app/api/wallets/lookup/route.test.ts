import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverApiWithRefresh = vi.fn();
vi.mock('@/lib/api/server', () => ({
  serverApiWithRefresh: (...args: unknown[]) => serverApiWithRefresh(...args),
}));

import { GET } from './route';

beforeEach(() => vi.clearAllMocks());

describe('GET /api/wallets/lookup', () => {
  it('forwards the handle and returns the recipient', async () => {
    serverApiWithRefresh.mockResolvedValue(
      new Response(JSON.stringify({ walletId: 'w2', currency: 'USD', recipientName: 'Alice Lee' }), { status: 200 }),
    );
    const res = await GET(new Request('http://localhost/api/wallets/lookup?handle=alice'));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ walletId: 'w2', recipientName: 'Alice Lee' });
    expect(serverApiWithRefresh).toHaveBeenCalledWith('/wallets/lookup?handle=alice');
  });

  it('mirrors a 404 for an unknown handle', async () => {
    serverApiWithRefresh.mockResolvedValue(new Response(null, { status: 404 }));
    const res = await GET(new Request('http://localhost/api/wallets/lookup?handle=ghost'));
    expect(res.status).toBe(404);
  });
});
