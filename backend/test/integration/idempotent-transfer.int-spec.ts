import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { bootApp, resetDb } from './db';

describe('POST /wallets/:id/transfers is idempotent over HTTP', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => ({ app, prisma } = await bootApp()));
  beforeEach(() => resetDb(prisma));
  afterAll(() => app.close());

  async function registered(tag: string, balance = 0) {
    const res = await http()
      .post('/auth/register')
      .send({ email: `${tag}@test.local`, handle: tag, password: 'Password123', firstName: tag, lastName: 'T' })
      .expect(201);
    const wallet = await prisma.wallet.findFirstOrThrow({ where: { userId: res.body.user.id } });
    if (balance) await prisma.wallet.update({ where: { id: wallet.id }, data: { balance } });
    return { token: res.body.tokens.accessToken as string, walletId: wallet.id };
  }
  const outRows = () => prisma.transaction.count({ where: { type: 'transfer_out' } });

  it('same key twice → one transfer, identical responses', async () => {
    const a = await registered('ann', 10_000);
    const b = await registered('ben');
    const body = { toWalletId: b.walletId, amount: 2500 };
    const send = () =>
      http().post(`/wallets/${a.walletId}/transfers`).set('Authorization', `Bearer ${a.token}`)
        .set('Idempotency-Key', 'op-1').send(body);

    const first = await send().expect(201);
    const second = await send().expect(201); // replayed, not re-run
    expect(second.body).toEqual(first.body);
    expect(await outRows()).toBe(1);
    expect((await prisma.wallet.findUniqueOrThrow({ where: { id: a.walletId } })).balance).toBe(7500);
  });

  it('3 simultaneous posts with one key → at most one runs; still one new transfer', async () => {
    const a = await registered('cat', 10_000);
    const b = await registered('dan');
    const send = () =>
      http().post(`/wallets/${a.walletId}/transfers`).set('Authorization', `Bearer ${a.token}`)
        .set('Idempotency-Key', 'op-race').send({ toWalletId: b.walletId, amount: 1000 });

    const statuses = (await Promise.all([send(), send(), send()])).map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201).length).toBeGreaterThanOrEqual(1);
    expect(statuses.every((s) => s === 201 || s === 409)).toBe(true); // replay or in-progress, never a 2nd run
    expect(await outRows()).toBe(1);
    expect((await prisma.wallet.findUniqueOrThrow({ where: { id: a.walletId } })).balance).toBe(9000);
  });

  it('a missing key is refused; reusing a key for a different body is a 409', async () => {
    const a = await registered('eve', 10_000);
    const b = await registered('fay');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${a.token}`);

    await auth(http().post(`/wallets/${a.walletId}/transfers`)).send({ toWalletId: b.walletId, amount: 100 }).expect(400);
    await auth(http().post(`/wallets/${a.walletId}/transfers`)).set('Idempotency-Key', 'op-2').send({ toWalletId: b.walletId, amount: 100 }).expect(201);
    await auth(http().post(`/wallets/${a.walletId}/transfers`)).set('Idempotency-Key', 'op-2').send({ toWalletId: b.walletId, amount: 999 }).expect(409);
    expect(await outRows()).toBe(1);
  });
});
