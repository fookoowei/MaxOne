import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverApiWithRefresh = vi.fn();
vi.mock('@/lib/api/server', () => ({
  serverApiWithRefresh: (...args: unknown[]) => serverApiWithRefresh(...args),
}));

import { PATCH } from './route';

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}
function body(b: unknown) {
  return new Request('http://localhost/api/users/u1/status', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(b),
  });
}

beforeEach(() => vi.clearAllMocks());

describe('PATCH /api/users/[id]/status', () => {
  it('forwards the status change to NestJS and returns the row', async () => {
    serverApiWithRefresh.mockResolvedValue(new Response(JSON.stringify({ id: 'u1', status: 'suspended' }), { status: 200 }));

    const res = await PATCH(body({ status: 'suspended' }), ctx('u1'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'u1', status: 'suspended' });
    expect(serverApiWithRefresh).toHaveBeenCalledWith(
      '/users/u1/status',
      expect.objectContaining({ method: 'PATCH' }),
    );
    const sent = JSON.parse((serverApiWithRefresh.mock.calls[0][1] as RequestInit).body as string);
    expect(sent).toEqual({ status: 'suspended' });
  });

  it('mirrors a 403 (SoD violation) with no body', async () => {
    serverApiWithRefresh.mockResolvedValue(new Response(null, { status: 403 }));
    const res = await PATCH(body({ status: 'suspended' }), ctx('u1'));
    expect(res.status).toBe(403);
  });
});
