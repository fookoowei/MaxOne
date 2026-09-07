import { INestApplication } from '@nestjs/common';
import { QueueService } from '../../src/queue/queue.service';
import { HEADER_RETRY_COUNT, QUEUES, ROUTING_KEYS } from '../../src/queue/events';
import { CacheService } from '../../src/cache/cache.service';
import { NotificationConsumer } from '../../src/worker/notification.consumer';
import { NotificationService } from '../../src/realtime/notification.service';
import { PushService } from '../../src/push/push.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import type { AmqpMessage } from '../../src/queue/amqp.types';
import { bootApp, resetDb, TestRedis } from './db';

// M16b against a REAL broker (vhost "test"): the unit fake proves the logic, this proves the wiring —
// topology exists, a publish lands in the durable queue, and notify() → consumer end to end.
const waitFor = async (cond: () => boolean, ms = 5000) => {
  const end = Date.now() + ms;
  while (!cond() && Date.now() < end) await new Promise((r) => setTimeout(r, 25));
  if (!cond()) throw new Error('timed out waiting');
};

describe('QueueService against a real RabbitMQ', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: TestRedis;
  let queue: QueueService;

  beforeAll(async () => {
    ({ app, prisma, redis, queue } = await bootApp());
  });
  beforeEach(() => resetDb(prisma, redis, queue));
  afterEach(async () => {
    await queue.cancel();
    jest.restoreAllMocks();
  });
  afterAll(() => app.close());

  it('is connected and publish returns true', () => {
    expect(queue.isConnected()).toBe(true);
    expect(queue.publish(ROUTING_KEYS.notificationPush, { probe: 1 })).toBe(true);
  });

  it('a published message is delivered to a consumer with the JSON body and application/json', async () => {
    const received: AmqpMessage[] = [];
    queue.publish(ROUTING_KEYS.notificationPush, { hello: 'broker' });
    await queue.consume(async (msg) => {
      received.push(msg);
      queue.ack(msg);
    });
    await waitFor(() => received.length === 1);
    expect(JSON.parse(received[0].content.toString())).toEqual({ hello: 'broker' });
    expect(received[0].properties.contentType).toBe('application/json');
    expect(received[0].fields.routingKey).toBe(ROUTING_KEYS.notificationPush);
  });

  it('NotificationService.notify → one notification.push event reaches the queue; API sends no push itself', async () => {
    const pushSpy = jest.spyOn(app.get(PushService), 'sendToUser');
    const received: unknown[] = [];
    await queue.consume(async (msg) => {
      received.push(JSON.parse(msg.content.toString()));
      queue.ack(msg);
    });
    const payload = { title: 'Deposit approved', body: '$100.00 added', tag: 'tx1', url: '/wallet' };
    await app.get(NotificationService).notify('user-1', payload);
    await waitFor(() => received.length === 1);
    expect(received[0]).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      type: 'notification.push',
      occurredAt: expect.any(String),
      userId: 'user-1',
      payload,
    });
    expect(pushSpy).not.toHaveBeenCalled();
  });

  // ---- M16c: dead-lettering, retry round-trip, idempotent consumer ----

  it('nack without requeue → the message lands in notifications.push.dead with an x-death header', async () => {
    queue.publish(ROUTING_KEYS.notificationPush, { bad: 'message' });
    let nacked = false;
    await queue.consume(async (msg) => {
      queue.nack(msg, false);
      nacked = true;
    });
    await waitFor(() => nacked);
    let d: AmqpMessage | false = false;
    for (let i = 0; i < 100 && d === false; i++) {
      d = await queue.peek(QUEUES.notificationsPushDead);
      if (d === false) await new Promise((r) => setTimeout(r, 50));
    }
    if (d === false) throw new Error('nothing reached the dead queue');
    expect(JSON.parse(d.content.toString())).toEqual({ bad: 'message' });
    const death = (d.properties.headers?.['x-death'] as { queue: string; reason: string }[])[0];
    expect(death.queue).toBe(QUEUES.notificationsPush);
    expect(death.reason).toBe('rejected');
  });

  it('a message published to retry.1 comes BACK to the main queue after ~5s with x-retry-count intact', async () => {
    const received: AmqpMessage[] = [];
    await queue.consume(async (msg) => {
      received.push(msg);
      queue.ack(msg);
    });
    const t0 = Date.now();
    queue.publish(ROUTING_KEYS.notificationPushRetry(1), { n: 'retry-me' }, { headers: { [HEADER_RETRY_COUNT]: 1 } });
    await new Promise((r) => setTimeout(r, 1000));
    expect(received).toHaveLength(0); // parked, not delivered yet
    await waitFor(() => received.length === 1, 9000);
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeGreaterThanOrEqual(4500);
    expect(JSON.parse(received[0].content.toString())).toEqual({ n: 'retry-me' });
    expect(received[0].properties.headers?.[HEADER_RETRY_COUNT]).toBe(1);
    const death = (received[0].properties.headers?.['x-death'] as { queue: string; reason: string }[])[0];
    expect(death.queue).toBe(QUEUES.notificationsPushRetry(1));
    expect(death.reason).toBe('expired');
  }, 15000);

  it('idempotent consumer: the same event id delivered twice → ONE push (real Redis mark), both acked', async () => {
    const push = app.get(PushService);
    const sendSpy = jest.spyOn(push, 'sendToUser').mockResolvedValue(undefined);
    const consumer = new NotificationConsumer(queue, push, app.get(CacheService));
    jest.spyOn((consumer as any).log, 'log').mockImplementation(() => undefined);
    const event = {
      id: '22222222-2222-2222-2222-222222222222',
      type: 'notification.push',
      occurredAt: new Date().toISOString(),
      userId: 'user-2',
      payload: { title: 'Deposit approved', body: '$1.00 added' },
    };
    let handled = 0;
    await queue.consume(async (msg) => {
      await consumer.handle(msg);
      handled += 1;
    });
    // Sequential on purpose: a real redelivery happens AFTER the first attempt finished (or crashed),
    // never concurrently with it. Two copies in flight at once would both miss the mark, because the
    // mark is written after success (the trade-off we chose over a claim-before-send).
    queue.publish(ROUTING_KEYS.notificationPush, event);
    await waitFor(() => handled === 1);
    queue.publish(ROUTING_KEYS.notificationPush, event); // the "redelivery"
    await waitFor(() => handled === 2);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(await app.get(CacheService).get(`mq:done:${event.id}`)).toBe(1);
    expect(await queue.peek(QUEUES.notificationsPush)).toBe(false); // both acked, nothing left
  });

  it('a message published with no consumer waits in the durable queue (drained by the next consumer)', async () => {
    queue.publish(ROUTING_KEYS.notificationPush, { n: 1 });
    queue.publish(ROUTING_KEYS.notificationPush, { n: 2 });
    await new Promise((r) => setTimeout(r, 100)); // let the broker enqueue
    const seen: number[] = [];
    await queue.consume(async (msg) => {
      seen.push((JSON.parse(msg.content.toString()) as { n: number }).n);
      queue.ack(msg);
    });
    await waitFor(() => seen.length === 2);
    expect(seen.sort()).toEqual([1, 2]);
  });
});
