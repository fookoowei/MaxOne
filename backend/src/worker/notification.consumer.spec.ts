import { NotificationConsumer } from './notification.consumer';
import type { AmqpMessage } from '../queue/amqp.types';

const msgOf = (body: unknown, headers: Record<string, unknown> = {}): AmqpMessage => ({
  content: Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)),
  fields: { deliveryTag: 1, redelivered: false, routingKey: 'notification.push' },
  properties: { contentType: 'application/json', headers },
});
const good = {
  id: '11111111-1111-1111-1111-111111111111',
  type: 'notification.push',
  occurredAt: '2026-09-07T00:00:00.000Z',
  userId: 'u1',
  payload: { title: 'Deposit approved', body: '$100.00 added', tag: 'tx1', url: '/wallet' },
};
const DONE_KEY = `mq:done:${good.id}`;

function build() {
  const queue = {
    consume: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockReturnValue(true),
    ack: jest.fn(),
    nack: jest.fn(),
    cancel: jest.fn().mockResolvedValue(undefined),
  };
  const push = { sendToUser: jest.fn().mockResolvedValue(undefined) };
  const cache = { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined) };
  const consumer = new NotificationConsumer(queue as any, push as any, cache as any);
  jest.spyOn((consumer as any).log, 'warn').mockImplementation(() => undefined);
  jest.spyOn((consumer as any).log, 'log').mockImplementation(() => undefined);
  return { queue, push, cache, consumer };
}

describe('NotificationConsumer', () => {
  it('start: registers the handler with prefetch 10', async () => {
    const { queue, consumer } = build();
    await consumer.start();
    expect(queue.consume).toHaveBeenCalledWith(expect.any(Function), 10);
  });

  it('valid event → push → mark done AFTER the push → ack', async () => {
    const { queue, push, cache, consumer } = build();
    const msg = msgOf(good);
    await consumer.handle(msg);
    expect(push.sendToUser).toHaveBeenCalledWith('u1', good.payload);
    expect(cache.set).toHaveBeenCalledWith(DONE_KEY, 1, 86_400);
    expect(cache.set.mock.invocationCallOrder[0]).toBeGreaterThan(push.sendToUser.mock.invocationCallOrder[0]);
    expect(queue.ack).toHaveBeenCalledWith(msg);
    expect(queue.nack).not.toHaveBeenCalled();
    expect(queue.publish).not.toHaveBeenCalled();
  });

  it('idempotent: an id already marked done → ack, NO push, no new mark', async () => {
    const { queue, push, cache, consumer } = build();
    cache.get.mockResolvedValue(1);
    const msg = msgOf(good);
    await consumer.handle(msg);
    expect(cache.get).toHaveBeenCalledWith(DONE_KEY);
    expect(push.sendToUser).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
    expect(queue.ack).toHaveBeenCalledWith(msg);
  });

  it('bad JSON → nack without requeue (→ DLQ via the queue DLX); Redis untouched', async () => {
    const { queue, push, cache, consumer } = build();
    const msg = msgOf('{nope');
    await consumer.handle(msg);
    expect(push.sendToUser).not.toHaveBeenCalled();
    expect(cache.get).not.toHaveBeenCalled();
    expect(queue.nack).toHaveBeenCalledWith(msg, false);
    expect(queue.ack).not.toHaveBeenCalled();
  });

  it('bad shape → nack without requeue', async () => {
    const { queue, consumer } = build();
    const msg = msgOf({ ...good, userId: undefined });
    await consumer.handle(msg);
    expect(queue.nack).toHaveBeenCalledWith(msg, false);
  });

  it('push fails, attempt 0 → republish to retry.1 with x-retry-count 1, ack the original, no mark', async () => {
    const { queue, push, cache, consumer } = build();
    push.sendToUser.mockRejectedValue(new Error('503'));
    const msg = msgOf(good);
    await consumer.handle(msg);
    expect(queue.publish).toHaveBeenCalledWith('notification.push.retry.1', good, {
      headers: { 'x-retry-count': 1 },
    });
    expect(queue.ack).toHaveBeenCalledWith(msg);
    expect(queue.nack).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('push fails, attempt 2 → republish to retry.3 with x-retry-count 3', async () => {
    const { queue, push, consumer } = build();
    push.sendToUser.mockRejectedValue(new Error('503'));
    await consumer.handle(msgOf(good, { 'x-retry-count': 2 }));
    expect(queue.publish).toHaveBeenCalledWith('notification.push.retry.3', good, {
      headers: { 'x-retry-count': 3 },
    });
  });

  it('push fails, attempt 3 (= MAX) → nack without requeue (→ DLQ), no republish', async () => {
    const { queue, push, consumer } = build();
    push.sendToUser.mockRejectedValue(new Error('503'));
    const msg = msgOf(good, { 'x-retry-count': 3 });
    await consumer.handle(msg);
    expect(queue.publish).not.toHaveBeenCalled();
    expect(queue.nack).toHaveBeenCalledWith(msg, false);
    expect(queue.ack).not.toHaveBeenCalled();
  });

  it('push fails AND the retry republish fails (broker gone) → nack WITH requeue, no ack', async () => {
    const { queue, push, consumer } = build();
    push.sendToUser.mockRejectedValue(new Error('503'));
    queue.publish.mockReturnValue(false);
    const msg = msgOf(good);
    await consumer.handle(msg);
    expect(queue.nack).toHaveBeenCalledWith(msg, true);
    expect(queue.ack).not.toHaveBeenCalled();
  });

  it('stop: cancels the consumer, then waits for in-flight handlers to finish', async () => {
    const { queue, push, consumer } = build();
    let release!: () => void;
    push.sendToUser.mockReturnValue(
      new Promise<void>((r) => {
        release = r;
      }),
    );
    const inFlight = consumer.handle(msgOf(good)); // hangs until release()
    let stopped = false;
    const stopping = consumer.stop().then(() => {
      stopped = true;
    });
    await Promise.resolve();
    expect(queue.cancel).toHaveBeenCalled();
    expect(stopped).toBe(false); // still draining
    release();
    await inFlight;
    await stopping;
    expect(stopped).toBe(true);
    expect(queue.ack).toHaveBeenCalledTimes(1);
  });
});
