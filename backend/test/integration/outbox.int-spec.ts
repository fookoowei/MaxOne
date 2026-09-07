import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { QueueService } from '../../src/queue/queue.service';
import { OutboxService } from '../../src/outbox/outbox.service';
import { WalletsService } from '../../src/wallets/wallets.service';
import type { AmqpMessage } from '../../src/queue/amqp.types';
import { bootApp, resetDb, TestRedis } from './db';

// M16d against real Postgres + RabbitMQ: the event row commits WITH the money; a broker outage at
// commit time leaves it pending; the relay publishes it once the broker is back. Nothing lost.
const waitFor = async (cond: () => boolean | Promise<boolean>, ms = 8000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await cond()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('timed out waiting');
};

describe('Transactional outbox', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: TestRedis;
  let queue: QueueService;
  let outbox: OutboxService;
  let wallets: WalletsService;

  beforeAll(async () => {
    ({ app, prisma, redis, queue } = await bootApp());
    outbox = app.get(OutboxService);
    wallets = app.get(WalletsService);
  });
  beforeEach(() => resetDb(prisma, redis, queue));
  afterEach(async () => {
    if (!queue.isConnected()) await queue.reconnectForTest();
    await queue.cancel();
  });
  afterAll(() => app.close());

  async function fundedUser(tag: string, balance: number) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: 'user' } });
    const user = await prisma.user.create({
      data: { email: `${tag}@test.local`, handle: tag, passwordHash: 'x', firstName: tag, lastName: 'T', roleId: role.id },
    });
    const wallet = await prisma.wallet.create({ data: { userId: user.id, name: 'main', currency: 'USD', balance } });
    return { actor: { id: user.id, email: user.email, role: 'user' }, wallet };
  }

  it('broker up: a transfer commits ONE outbox row, publishes it at once, and the message carries messageId = row id', async () => {
    const a = await fundedUser('alice', 10_000);
    const b = await fundedUser('bob', 0);
    const received: AmqpMessage[] = [];
    await queue.consume(async (msg) => {
      received.push(msg);
      queue.ack(msg);
    });

    await wallets.transfer(a.wallet.id, a.actor, { toWalletId: b.wallet.id, amount: 2500 });

    await waitFor(() => received.length === 1);
    const rows = await prisma.outboxEvent.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('published');
    expect(rows[0].publishedAt).not.toBeNull();
    expect(received[0].properties.messageId).toBe(rows[0].id);
    const body = JSON.parse(received[0].content.toString());
    expect(body.id).toBe(rows[0].id);
    expect(body.userId).toBe(b.actor.id);
    expect(body.payload.title).toBe('Received $25.00');
  });

  it('broker DOWN at commit: the transfer still succeeds, the row waits pending, and the relay publishes it after reconnect', async () => {
    const a = await fundedUser('carol', 10_000);
    const b = await fundedUser('dave', 0);
    await queue.disconnectForTest();
    expect(queue.isConnected()).toBe(false);

    // The money moves regardless — the broker is never a dependency of the ledger path.
    await expect(wallets.transfer(a.wallet.id, a.actor, { toWalletId: b.wallet.id, amount: 1000 })).resolves.toBeDefined();
    const pending = await prisma.outboxEvent.findFirstOrThrow();
    expect(pending.status).toBe('pending');
    expect(pending.attempts).toBe(1); // publishNow tried and recorded the failure
    expect(pending.lastError).toMatch(/broker unavailable/);
    expect((await prisma.wallet.findUniqueOrThrow({ where: { id: b.wallet.id } })).balance).toBe(1000);

    // Broker is back. The relay (the 2s tick or a direct call — either is fine) publishes the row.
    await queue.reconnectForTest();
    const received: AmqpMessage[] = [];
    await queue.consume(async (msg) => {
      received.push(msg);
      queue.ack(msg);
    });
    await outbox.relayPending();
    await waitFor(() => received.length === 1);
    await waitFor(async () => (await prisma.outboxEvent.findUniqueOrThrow({ where: { id: pending.id } })).status === 'published');
    expect(received[0].properties.messageId).toBe(pending.id);
    expect(JSON.parse(received[0].content.toString()).userId).toBe(b.actor.id);
  });

  it('purge: deletes published rows older than 7 days, keeps recent and pending ones', async () => {
    const day = 86_400_000;
    await prisma.outboxEvent.createMany({
      data: [
        { id: '00000000-0000-4000-8000-000000000001', routingKey: 'k', payload: {}, status: 'published', publishedAt: new Date(Date.now() - 8 * day) },
        { id: '00000000-0000-4000-8000-000000000002', routingKey: 'k', payload: {}, status: 'published', publishedAt: new Date(Date.now() - 1 * day) },
        { id: '00000000-0000-4000-8000-000000000003', routingKey: 'k', payload: {}, status: 'pending' },
      ],
    });
    expect(await outbox.purgePublished()).toBe(1);
    const left = (await prisma.outboxEvent.findMany()).map((r) => r.id).sort();
    expect(left).toEqual(['00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003']);
  });
});
