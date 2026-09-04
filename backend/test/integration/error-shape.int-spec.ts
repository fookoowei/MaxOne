import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { bootApp, resetDb } from './db';

// M15c: over REAL HTTP, every error body has the same envelope and a stable `code`.
describe('uniform error shape', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => ({ app, prisma } = await bootApp()));
  beforeEach(() => resetDb(prisma));
  afterAll(() => app.close());

  async function registered(tag: string) {
    const res = await http()
      .post('/auth/register')
      .send({ email: `${tag}@test.local`, handle: tag, password: 'Password123', firstName: tag, lastName: 'T' })
      .expect(201);
    const wallet = await prisma.wallet.findFirstOrThrow({ where: { userId: res.body.user.id } });
    return { token: res.body.tokens.accessToken as string, walletId: wallet.id };
  }
  const envelope = (statusCode: number, code: string, path: string) => ({
    statusCode,
    code,
    message: expect.any(String),
    path,
    timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
  });

  it('404 NOT_FOUND for a wallet that does not exist', async () => {
    const { token } = await registered('ann');
    const path = `/wallets/${randomUUID()}`;
    const res = await http().get(path).set('Authorization', `Bearer ${token}`).expect(404);
    expect(res.body).toEqual(envelope(404, 'NOT_FOUND', path));
  });

  it('401 UNAUTHORIZED without a token', async () => {
    const res = await http().get('/wallets/whatever').expect(401);
    expect(res.body).toEqual(envelope(401, 'UNAUTHORIZED', '/wallets/whatever'));
  });

  it('400 VALIDATION_FAILED with per-field details from the ValidationPipe', async () => {
    const res = await http().post('/auth/register').send({ email: 'not-an-email', password: 'x' }).expect(400);
    expect(res.body).toEqual({ ...envelope(400, 'VALIDATION_FAILED', '/auth/register'), details: expect.any(Array) });
    expect(res.body.details.join(' ')).toMatch(/email/i);
  });

  it('400 IDEMPOTENCY_KEY_REQUIRED on a money route without the header', async () => {
    const a = await registered('bob');
    const b = await registered('cal');
    const path = `/wallets/${a.walletId}/transfers`;
    const res = await http().post(path).set('Authorization', `Bearer ${a.token}`)
      .send({ toWalletId: b.walletId, amount: 100 }).expect(400);
    expect(res.body).toEqual(envelope(400, 'IDEMPOTENCY_KEY_REQUIRED', path));
  });
});
