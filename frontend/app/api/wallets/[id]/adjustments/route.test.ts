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
  return new Request('http://localhost/api/wallets/w1/adjustments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(b),
  });
}

beforeEach(() => vi.clearAllMocks());

describe('POST /api/wallets/[id]/adjustments', () => {
  it('forwards direction/amount/note to NestJS and returns the row', async () => {
    serverApiWithRefresh.mockResolvedValue(new Response(JSON.stringify({ id: 't1' }), { status: 201 }));

    const res = await POST(body({ direction: 'credit', amount: 5000, note: 'bonus' }), ctx('w1'));

    expect(res.status).toBe(200); // Response.json() normalizes to 200
    expect(await res.json()).toEqual({ id: 't1' });
    expect(serverApiWithRefresh).toHaveBeenCalledWith(
      '/wallets/w1/adjustments',
      expect.objectContaining({ method: 'POST' }),
    );
    const sent = JSON.parse((serverApiWithRefresh.mock.calls[0][1] as RequestInit).body as string);
    expect(sent).toEqual({ direction: 'credit', amount: 5000, note: 'bonus' });
  });

  it('mirrors a 400 (e.g. would-go-negative) with no body', async () => {
    serverApiWithRefresh.mockResolvedValue(new Response(null, { status: 400 }));
    const res = await POST(body({ direction: 'debit', amount: 999999, note: 'x' }), ctx('w1'));
    expect(res.status).toBe(400);
  });
});
