import { Prisma } from '@prisma/client';
import { IdempotencyService } from './idempotency.service';

const dup = () => new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 't' });
function build(m: Record<string, jest.Mock> = {}) {
  const idempotencyKey = { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn(), update: jest.fn(), deleteMany: jest.fn(), ...m };
  return { svc: new IdempotencyService({ idempotencyKey } as any), db: idempotencyKey };
}
const fresh = (over: any = {}) => ({ id: 'r1', fingerprint: 'fp', status: 'completed', statusCode: 201, responseBody: { id: 't1' }, createdAt: new Date(), ...over });

describe('IdempotencyService.reserve', () => {
  it('claims a new key', async () => {
    const { svc } = build({ create: jest.fn().mockResolvedValue({ id: 'r1' }) });
    expect(await svc.reserve('u1', 'k', 'fp')).toEqual({ kind: 'new', id: 'r1' });
  });
  it('replays a completed key with the same fingerprint', async () => {
    const { svc, db } = build({ create: jest.fn().mockRejectedValue(dup()), findUnique: jest.fn().mockResolvedValue(fresh()) });
    expect(await svc.reserve('u1', 'k', 'fp')).toEqual({ kind: 'replay', statusCode: 201, body: { id: 't1' } });
    expect(db.findUnique).toHaveBeenCalledWith({ where: { userId_key: { userId: 'u1', key: 'k' } } });
  });
  it('flags a mismatch when the same key is reused for a different request', async () => {
    const { svc } = build({ create: jest.fn().mockRejectedValue(dup()), findUnique: jest.fn().mockResolvedValue(fresh({ fingerprint: 'OTHER' })) });
    expect(await svc.reserve('u1', 'k', 'fp')).toEqual({ kind: 'mismatch' });
  });
  it('flags in-progress when the first request is still running', async () => {
    const { svc } = build({ create: jest.fn().mockRejectedValue(dup()), findUnique: jest.fn().mockResolvedValue(fresh({ status: 'pending' })) });
    expect(await svc.reserve('u1', 'k', 'fp')).toEqual({ kind: 'in_progress' });
  });
  it('treats an expired record as new (deletes it, re-reserves)', async () => {
    const create = jest.fn().mockRejectedValueOnce(dup()).mockResolvedValueOnce({ id: 'r2' });
    const del = jest.fn().mockResolvedValue({});
    const { svc } = build({ create, delete: del, findUnique: jest.fn().mockResolvedValue(fresh({ createdAt: new Date(Date.now() - 25 * 3600 * 1000) })) });
    expect(await svc.reserve('u1', 'k', 'fp')).toEqual({ kind: 'new', id: 'r2' });
    expect(del).toHaveBeenCalledWith({ where: { id: 'r1' } });
  });
  it('rethrows non-unique DB errors', async () => {
    const { svc } = build({ create: jest.fn().mockRejectedValue(new Error('db down')) });
    await expect(svc.reserve('u1', 'k', 'fp')).rejects.toThrow('db down');
  });
});

describe('IdempotencyService.complete / release', () => {
  it('stores the response', async () => {
    const { svc, db } = build({ update: jest.fn().mockResolvedValue({}) });
    await svc.complete('r1', 201, { id: 't1' });
    expect(db.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { status: 'completed', statusCode: 201, responseBody: { id: 't1' } } });
  });
  it('release frees the reservation', async () => {
    const { svc, db } = build({ deleteMany: jest.fn().mockResolvedValue({ count: 1 }) });
    await svc.release('r1');
    expect(db.deleteMany).toHaveBeenCalledWith({ where: { id: 'r1' } });
  });
});
