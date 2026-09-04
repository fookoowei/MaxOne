import { INestApplication } from '@nestjs/common';
import { IdempotencyService } from '../../src/idempotency/idempotency.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { bootApp, resetDb } from './db';

describe('IdempotencyService against a real Postgres', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let idem: IdempotencyService;

  beforeAll(async () => {
    ({ app, prisma } = await bootApp());
    idem = app.get(IdempotencyService);
  });
  beforeEach(() => resetDb(prisma));
  afterAll(() => app.close());

  it('5 simultaneous reserves of one key → exactly ONE wins, the rest are in-progress', async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => idem.reserve('u1', 'k1', 'fp')));
    const kinds = results.map((r) => r.kind).sort();
    expect(kinds.filter((k) => k === 'new')).toHaveLength(1); // the unique INSERT is the guarantee
    expect(kinds.filter((k) => k === 'in_progress')).toHaveLength(4);
    expect(await prisma.idempotencyKey.count()).toBe(1);
  });

  it('completed → replay; different body → mismatch; released → new again', async () => {
    const first = await idem.reserve('u1', 'k2', 'fp');
    if (first.kind !== 'new') throw new Error('expected new');
    await idem.complete(first.id, 201, { id: 't1' });

    expect(await idem.reserve('u1', 'k2', 'fp')).toEqual({ kind: 'replay', statusCode: 201, body: { id: 't1' } });
    expect(await idem.reserve('u1', 'k2', 'OTHER-BODY')).toEqual({ kind: 'mismatch' });
    expect((await idem.reserve('u2', 'k2', 'fp')).kind).toBe('new'); // keys are per user

    await idem.release(first.id);
    expect((await idem.reserve('u1', 'k2', 'fp')).kind).toBe('new');
  });
});
