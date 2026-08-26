import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverApiWithRefresh = vi.fn();
vi.mock('@/lib/api/server', () => ({
  serverApiWithRefresh: (...args: unknown[]) => serverApiWithRefresh(...args),
}));

import { POST } from './route';

function body(b: unknown) {
  return new Request('http://localhost/api/wallets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(b),
  });
}

beforeEach(() => vi.clearAllMocks());

describe('POST /api/wallets', () => {
  it('forwards name/currency and returns the wallet', async () => {
    serverApiWithRefresh.mockResolvedValue(new Response(JSON.stringify({ id: 'w2' }), { status: 201 }));
    const res = await POST(body({ currency: 'EUR' }));

    expect(res.status).toBe(200);
    expect(serverApiWithRefresh).toHaveBeenCalledWith('/wallets', expect.objectContaining({ method: 'POST' }));
    const sent = JSON.parse((serverApiWithRefresh.mock.calls[0][1] as RequestInit).body as string);
    expect(sent).toEqual({ name: 'EUR wallet', currency: 'EUR' });
  });

  it('mirrors a non-OK status', async () => {
    serverApiWithRefresh.mockResolvedValue(new Response(null, { status: 400 }));
    const res = await POST(body({ currency: 'EUR' }));
    expect(res.status).toBe(400);
  });
});
