import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { QueueService } from '../../src/queue/queue.service';
import { bootApp, resetDb, TestRedis } from './db';

// M17 against the real stack: /health tells the truth, /metrics exposes the M16 gauges, and every
// response carries a request id (honoured if the client sent one).
describe('Observability (M17)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: TestRedis;
  let queue: QueueService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma, redis, queue } = await bootApp());
  });
  beforeEach(() => resetDb(prisma, redis, queue));
  afterAll(() => app.close());

  it('GET /health → 200 ok with db/redis/rabbitmq up and the M16 numbers', async () => {
    const res = await http().get('/health').expect(200);
    expect(res.body).toEqual({
      status: 'ok',
      db: 'up',
      redis: 'up',
      rabbitmq: 'up',
      outboxPending: 0,
      deadLetters: 0,
    });
  });

  it('GET /health with the broker gone → 200 degraded (still serving), rabbitmq down', async () => {
    await queue.disconnectForTest();
    const res = await http().get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'degraded', db: 'up', rabbitmq: 'down', deadLetters: null });
    await queue.reconnectForTest();
  });

  it('GET /metrics → Prometheus text with the maxone_ gauges', async () => {
    const res = await http().get('/metrics').expect(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    for (const g of ['maxone_outbox_pending', 'maxone_outbox_oldest_pending_seconds', 'maxone_dead_letters', 'maxone_redis_up', 'maxone_rabbitmq_up']) {
      expect(res.text).toMatch(new RegExp(`^${g} \\d`, 'm'));
    }
  });

  it('every response carries x-request-id: minted when absent, echoed when sent', async () => {
    const minted = await http().get('/health');
    expect(minted.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    const echoed = await http().get('/health').set('x-request-id', 'trace-me-123');
    expect(echoed.headers['x-request-id']).toBe('trace-me-123');
  });
});
