import { ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { EXCHANGE, QUEUES, ROUTING_KEYS } from './events';
import { brokenConnect, fakeAmqp } from '../../test/fakes/fake-amqp';

const config = { get: () => 'amqp://guest:guest@localhost:5672/' } as unknown as ConfigService;

describe('QueueService', () => {
  it('asserts the topology on init: exchange, queue, binding', async () => {
    const amqp = fakeAmqp();
    const svc = new QueueService(amqp.connect, config);
    await svc.onModuleInit();
    expect(svc.isConnected()).toBe(true);
    expect(amqp.asserted).toEqual([
      `exchange:${EXCHANGE}`,
      `queue:${QUEUES.notificationsPush}`,
      `bind:${QUEUES.notificationsPush}<-${EXCHANGE}:${ROUTING_KEYS.notificationPush}`,
    ]);
    await svc.onModuleDestroy();
  });

  it('publish: JSON body, persistent, application/json, to the exchange with the routing key', async () => {
    const amqp = fakeAmqp();
    const svc = new QueueService(amqp.connect, config);
    await svc.onModuleInit();
    expect(svc.publish(ROUTING_KEYS.notificationPush, { a: 1 })).toBe(true);
    expect(amqp.published).toEqual([
      {
        exchange: EXCHANGE,
        routingKey: ROUTING_KEYS.notificationPush,
        body: { a: 1 },
        opts: { persistent: true, contentType: 'application/json' },
      },
    ]);
    await svc.onModuleDestroy();
  });

  it('is fail-soft: broker down at boot → init resolves, publish returns false, one warning per distinct error', async () => {
    jest.useFakeTimers();
    const svc = new QueueService(brokenConnect, config);
    const warn = jest.spyOn((svc as any).log, 'warn').mockImplementation(() => undefined);
    await expect(svc.onModuleInit()).resolves.toBeUndefined();
    expect(svc.isConnected()).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1); // the connect failure
    expect(svc.publish(ROUTING_KEYS.notificationPush, { a: 1 })).toBe(false);
    expect(svc.publish(ROUTING_KEYS.notificationPush, { a: 2 })).toBe(false);
    expect(warn).toHaveBeenCalledTimes(2); // + "not connected" once — the second drop adds no line
    expect(warn.mock.calls[1][0]).toMatch(/not connected/);
    await svc.onModuleDestroy(); // clears the reconnect timer
    jest.useRealTimers();
  });

  it('reconnects after the broker drops the connection (backoff 500ms·attempt, capped 10s)', async () => {
    jest.useFakeTimers();
    const amqp = fakeAmqp();
    let calls = 0;
    const connect = async () => {
      calls++;
      return amqp.connect();
    };
    const svc = new QueueService(connect, config);
    jest.spyOn((svc as any).log, 'warn').mockImplementation(() => undefined);
    await svc.onModuleInit();
    expect(calls).toBe(1);
    amqp.dropConnection();
    expect(svc.isConnected()).toBe(false);
    await jest.advanceTimersByTimeAsync(500);
    expect(calls).toBe(2);
    expect(svc.isConnected()).toBe(true);
    await svc.onModuleDestroy();
    jest.useRealTimers();
  });

  it('onClose listeners fire when the connection drops (the worker exits on this)', async () => {
    const amqp = fakeAmqp();
    const svc = new QueueService(amqp.connect, config);
    jest.spyOn((svc as any).log, 'warn').mockImplementation(() => undefined);
    await svc.onModuleInit();
    const seen = jest.fn();
    svc.onClose(seen);
    amqp.dropConnection();
    expect(seen).toHaveBeenCalledTimes(1);
    await svc.onModuleDestroy();
  });

  it('consume sets prefetch and hands messages to the handler; ack/nack/cancel/purge reach the channel', async () => {
    const amqp = fakeAmqp();
    const svc = new QueueService(amqp.connect, config);
    await svc.onModuleInit();
    const handler = jest.fn().mockResolvedValue(undefined);
    await svc.consume(handler, 7);
    expect(amqp.prefetch).toBe(7);
    const msg = amqp.deliver({ hello: 'world' });
    expect(handler).toHaveBeenCalledWith(msg);
    svc.ack(msg);
    svc.nack(msg);
    expect(amqp.acked).toEqual([msg]);
    expect(amqp.nacked).toEqual([{ msg, requeue: false }]);
    await svc.cancel();
    expect(amqp.cancelled).toBe(true);
    await svc.purge();
    expect(amqp.purged).toBe(1);
    await svc.onModuleDestroy();
  });

  it('consume throws when not connected (the worker must not run silently)', async () => {
    const svc = new QueueService(brokenConnect, config);
    jest.spyOn((svc as any).log, 'warn').mockImplementation(() => undefined);
    await svc.onModuleInit();
    await expect(svc.consume(async () => undefined)).rejects.toThrow('not connected');
    await svc.onModuleDestroy();
  });
});
