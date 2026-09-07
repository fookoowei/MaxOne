import { INestApplication } from '@nestjs/common';
import { QueueService } from '../../src/queue/queue.service';
import { ROUTING_KEYS } from '../../src/queue/events';
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
