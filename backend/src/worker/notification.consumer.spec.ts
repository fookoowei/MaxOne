import { NotificationConsumer } from './notification.consumer';
import type { AmqpMessage } from '../queue/amqp.types';

const msgOf = (body: unknown): AmqpMessage => ({
  content: Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)),
  fields: { deliveryTag: 1, redelivered: false, routingKey: 'notification.push' },
  properties: { contentType: 'application/json' },
});
const good = {
  id: '11111111-1111-1111-1111-111111111111',
  type: 'notification.push',
  occurredAt: '2026-09-07T00:00:00.000Z',
  userId: 'u1',
  payload: { title: 'Deposit approved', body: '$100.00 added', tag: 'tx1', url: '/wallet' },
};

function build() {
  const queue = {
    consume: jest.fn().mockResolvedValue(undefined),
    ack: jest.fn(),
    nack: jest.fn(),
    cancel: jest.fn().mockResolvedValue(undefined),
  };
  const push = { sendToUser: jest.fn().mockResolvedValue(undefined) };
  const consumer = new NotificationConsumer(queue as any, push as any);
  jest.spyOn((consumer as any).log, 'warn').mockImplementation(() => undefined);
  jest.spyOn((consumer as any).log, 'log').mockImplementation(() => undefined);
  return { queue, push, consumer };
}

describe('NotificationConsumer', () => {
  it('start: registers the handler with prefetch 10', async () => {
    const { queue, consumer } = build();
    await consumer.start();
    expect(queue.consume).toHaveBeenCalledWith(expect.any(Function), 10);
  });

  it('valid event → push sent to that user with the payload → ack', async () => {
    const { queue, push, consumer } = build();
    const msg = msgOf(good);
    await consumer.handle(msg);
    expect(push.sendToUser).toHaveBeenCalledWith('u1', good.payload);
    expect(queue.ack).toHaveBeenCalledWith(msg);
    expect(queue.nack).not.toHaveBeenCalled();
  });

  it('bad JSON → nack without requeue, push NOT called', async () => {
    const { queue, push, consumer } = build();
    const msg = msgOf('{nope');
    await consumer.handle(msg);
    expect(push.sendToUser).not.toHaveBeenCalled();
    expect(queue.nack).toHaveBeenCalledWith(msg, false);
    expect(queue.ack).not.toHaveBeenCalled();
  });

  it('bad shape → nack without requeue', async () => {
    const { queue, push, consumer } = build();
    const msg = msgOf({ ...good, userId: undefined });
    await consumer.handle(msg);
    expect(push.sendToUser).not.toHaveBeenCalled();
    expect(queue.nack).toHaveBeenCalledWith(msg, false);
  });

  it('push throws → nack without requeue (retries are M16c)', async () => {
    const { queue, push, consumer } = build();
    push.sendToUser.mockRejectedValue(new Error('boom'));
    const msg = msgOf(good);
    await consumer.handle(msg);
    expect(queue.nack).toHaveBeenCalledWith(msg, false);
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
