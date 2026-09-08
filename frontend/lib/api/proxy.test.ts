import { describe, expect, it } from 'vitest';
import { proxy } from './proxy';

describe('proxy', () => {
  it('forwards status, body and content-type — including error envelopes', async () => {
    const upstream = new Response('{"code":"INSUFFICIENT_FUNDS","message":"Insufficient funds"}', {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
    const out = await proxy(upstream);
    expect(out.status).toBe(400);
    expect(out.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(await out.json()).toEqual({ code: 'INSUFFICIENT_FUNDS', message: 'Insufficient funds' });
  });
  it('forwards an empty body without inventing a content-type', async () => {
    const out = await proxy(new Response(null, { status: 204 }));
    expect(out.status).toBe(204);
    expect(out.headers.get('content-type')).toBeNull();
  });
});
