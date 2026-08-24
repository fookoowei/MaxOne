import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverApiWithRefresh = vi.fn();
vi.mock('@/lib/api/server', () => ({
  serverApiWithRefresh: (...args: unknown[]) => serverApiWithRefresh(...args),
}));

import { POST } from './route';

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}
function body(b: unknown) {
  return new Request('http://localhost/api/wallets/w1/transfers', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(b),
  });
}

beforeEach(() => vi.clearAllMocks());

describe('POST /api/wallets/[id]/transfers', () => {
  it('forwards toWalletId/amount/note to NestJS and returns the row', async () => {
    serverApiWithRefresh.mockResolvedValue(new Response(JSON.stringify({ id: 't1' }), { status: 201 }));

    const res = await POST(body({ toWalletId: 'w2', amount: 5000, note: 'lunch' }), ctx('w1'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 't1' });
    expect(serverApiWithRefresh).toHaveBeenCalledWith(
      '/wallets/w1/transfers',
      expect.objectContaining({ method: 'POST' }),
    );
    const sent = JSON.parse((serverApiWithRefresh.mock.calls[0][1] as RequestInit).body as string);
    expect(sent).toEqual({ toWalletId: 'w2', amount: 5000, note: 'lunch' });
  });

  it('mirrors a non-OK status with no body', async () => {
    serverApiWithRefresh.mockResolvedValue(new Response(null, { status: 400 }));
    const res = await POST(body({ toWalletId: 'w2', amount: 999999 }), ctx('w1'));
    expect(res.status).toBe(400);
  });
});
