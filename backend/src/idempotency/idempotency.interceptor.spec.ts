import { BadRequestException, ConflictException } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { IdempotencyInterceptor, IDEMPOTENCY_HEADER } from './idempotency.interceptor';

function build(required: boolean, reservation: any, headers: Record<string, string> = {}) {
  const idem = { reserve: jest.fn().mockResolvedValue(reservation), complete: jest.fn().mockResolvedValue({}), release: jest.fn().mockResolvedValue(undefined) };
  const reflector = { get: () => ({ required }) };
  const res = { statusCode: 201, status: jest.fn() };
  const req = { user: { id: 'u1' }, headers, method: 'POST', url: '/wallets/w1/transfers', body: { amount: 100 } };
  const ctx = { getHandler: () => ({}), switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }) } as any;
  const handle = jest.fn(() => of({ id: 't1' }));
  return { interceptor: new IdempotencyInterceptor(idem as any, reflector as any), idem, res, ctx, handler: { handle } };
}

describe('IdempotencyInterceptor', () => {
  it('400 when the key is missing on a required route', () => {
    const { interceptor, ctx, handler } = build(true, null);
    expect(() => interceptor.intercept(ctx, handler)).toThrow(BadRequestException);
    // Stable machine-readable code (M15c): clients branch on this, never on the message text.
    expect(() => interceptor.intercept(ctx, handler)).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: 'IDEMPOTENCY_KEY_REQUIRED' }) }),
    );
  });
  it('runs normally when the key is missing on an optional route', async () => {
    const { interceptor, ctx, handler, idem } = build(false, null);
    expect(await lastValueFrom(interceptor.intercept(ctx, handler))).toEqual({ id: 't1' });
    expect(idem.reserve).not.toHaveBeenCalled();
  });
  it('replays the stored response WITHOUT running the handler', async () => {
    const { interceptor, ctx, handler, res } = build(true, { kind: 'replay', statusCode: 201, body: { id: 'orig' } }, { [IDEMPOTENCY_HEADER]: 'k1' });
    expect(await lastValueFrom(interceptor.intercept(ctx, handler))).toEqual({ id: 'orig' });
    expect(handler.handle).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
  it('409 on a fingerprint mismatch', async () => {
    const { interceptor, ctx, handler } = build(true, { kind: 'mismatch' }, { [IDEMPOTENCY_HEADER]: 'k1' });
    const err = await lastValueFrom(interceptor.intercept(ctx, handler)).catch((e) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse()).toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
  });
  it('409 while the first request is still in progress', async () => {
    const { interceptor, ctx, handler } = build(true, { kind: 'in_progress' }, { [IDEMPOTENCY_HEADER]: 'k1' });
    await expect(lastValueFrom(interceptor.intercept(ctx, handler))).rejects.toBeInstanceOf(ConflictException);
  });
  it('new key: runs the handler, stores status + body, returns the body', async () => {
    const { interceptor, ctx, handler, idem } = build(true, { kind: 'new', id: 'r1' }, { [IDEMPOTENCY_HEADER]: 'k1' });
    expect(await lastValueFrom(interceptor.intercept(ctx, handler))).toEqual({ id: 't1' });
    expect(idem.reserve).toHaveBeenCalledWith('u1', 'k1', expect.any(String));
    expect(idem.complete).toHaveBeenCalledWith('r1', 201, { id: 't1' });
  });
  it('handler error: releases the reservation and propagates the error', async () => {
    const { interceptor, ctx, idem } = build(true, { kind: 'new', id: 'r1' }, { [IDEMPOTENCY_HEADER]: 'k1' });
    const failing = { handle: () => throwError(() => new Error('insufficient funds')) };
    await expect(lastValueFrom(interceptor.intercept(ctx, failing))).rejects.toThrow('insufficient funds');
    expect(idem.release).toHaveBeenCalledWith('r1');
    expect(idem.complete).not.toHaveBeenCalled();
  });
});
