import { ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { EXCHANGES, QUEUES, RETRY_DELAYS_MS, ROUTING_KEYS } from './events';
import { brokenConnect, fakeAmqp } from '../../test/fakes/fake-amqp';

const url = 'amqp://guest:guest@localhost:5672/';
const config = { get: () => url, getOrThrow: () => url } as unknown as ConfigService;

describe('QueueService', () => {
  it('asserts the topology on init: exchange, queue, binding', async () => {
    const amqp = fakeAmqp();
    const svc = new QueueService(amqp.connect, config);
    await svc.onModuleInit();
    expect(svc.isConnected()).toBe(true);
    expect(amqp.asserted).toEqual([
      `exchange:${EXCHANGES.events}`,
      `exchange:${EXCHANGES.dlx}`,
      `queue:${QUEUES.notificationsPushDead}`,
      `bind:${QUEUES.notificationsPushDead}<-${EXCHANGES.dlx}:${ROUTING_KEYS.notificationPushDead}`,
      `queue:${QUEUES.notificationsPush}`,
      `bind:${QUEUES.notificationsPush}<-${EXCHANGES.events}:${ROUTING_KEYS.notificationPush}`,
      `queue:${QUEUES.notificationsPushRetry(1)}`,
      `bind:${QUEUES.notificationsPushRetry(1)}<-${EXCHANGES.events}:${ROUTING_KEYS.notificationPushRetry(1)}`,
      `queue:${QUEUES.notificationsPushRetry(2)}`,
      `bind:${QUEUES.notificationsPushRetry(2)}<-${EXCHANGES.events}:${ROUTING_KEYS.notificationPushRetry(2)}`,
      `queue:${QUEUES.notificationsPushRetry(3)}`,
      `bind:${QUEUES.notificationsPushRetry(3)}<-${EXCHANGES.events}:${ROUTING_KEYS.notificationPushRetry(3)}`,
    ]);
    await svc.onModuleDestroy();
  });

  it('M16c topology: main queue dead-letters to wallet.dlx; retry queues have TTL + dead-letter back to wallet.events', async () => {
    const amqp = fakeAmqp();
    const svc = new QueueService(amqp.connect, config);
    await svc.onModuleInit();
    expect(amqp.queueArgs[QUEUES.notificationsPush]).toEqual({
      'x-dead-letter-exchange': EXCHANGES.dlx,
      'x-dead-letter-routing-key': ROUTING_KEYS.notificationPushDead,
    });
    expect(amqp.queueArgs[QUEUES.notificationsPushDead]).toBeUndefined();
    RETRY_DELAYS_MS.forEach((ttl, i) => {
      expect(amqp.queueArgs[QUEUES.notificationsPushRetry(i + 1)]).toEqual({
        'x-message-ttl': ttl,
        'x-dead-letter-exchange': EXCHANGES.events,
        'x-dead-letter-routing-key': ROUTING_KEYS.notificationPush,
      });
    });
    await svc.onModuleDestroy();
  });

  it('publish forwards headers (used by the consumer to carry the retry count)', async () => {
    const amqp = fakeAmqp();
    const svc = new QueueService(amqp.connect, config);
    await svc.onModuleInit();
    svc.publish(ROUTING_KEYS.notificationPushRetry(1), { a: 1 }, { headers: { 'x-retry-count': 1 } });
    expect(amqp.published[0].opts).toEqual({
      persistent: true,
      contentType: 'application/json',
      headers: { 'x-retry-count': 1 },
    });
    await svc.onModuleDestroy();
  });

  it('publish: JSON body, persistent, application/json, to the exchange with the routing key', async () => {
    const amqp = fakeAmqp();
    const svc = new QueueService(amqp.connect, config);
    await svc.onModuleInit();
    expect(svc.publish(ROUTING_KEYS.notificationPush, { a: 1 })).toBe(true);
    expect(amqp.published).toEqual([
      {
        exchange: EXCHANGES.events,
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

  it('onClose listeners do NOT fire for our own shutdown (a graceful stop must exit 0)', async () => {
    const amqp = fakeAmqp();
    const svc = new QueueService(amqp.connect, config);
    await svc.onModuleInit();
    const seen = jest.fn();
    svc.onClose(seen);
    await svc.onModuleDestroy();
    amqp.dropConnection(); // the broker reports the close we asked for
    expect(seen).not.toHaveBeenCalled();
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
