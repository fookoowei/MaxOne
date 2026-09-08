import { OpsWatchService } from './ops-watch.service';
import * as sentry from './sentry';

function build(over: Partial<{ dead: number; pending: number; oldestAgeSec: number; redis: boolean; rabbit: boolean }> = {}) {
  const o = { dead: 0, pending: 0, oldestAgeSec: 0, redis: true, rabbit: true, ...over };
  const prisma = {
    outboxEvent: {
      count: jest.fn().mockResolvedValue(o.pending),
      findFirst: jest.fn().mockResolvedValue(o.pending ? { createdAt: new Date(Date.now() - o.oldestAgeSec * 1000) } : null),
    },
  };
  const queue = { depth: jest.fn().mockResolvedValue(o.dead), isConnected: jest.fn().mockReturnValue(o.rabbit) };
  const cache = { ping: jest.fn().mockResolvedValue(o.redis) };
  const svc = new OpsWatchService(prisma as any, queue as any, cache as any);
  const error = jest.spyOn((svc as any).log, 'error').mockImplementation(() => undefined);
  const info = jest.spyOn((svc as any).log, 'log').mockImplementation(() => undefined);
  jest.spyOn((svc as any).log, 'warn').mockImplementation(() => undefined);
  return { svc, prisma, queue, cache, error, info };
}

describe('OpsWatchService (M17)', () => {
  const capture = jest.spyOn(sentry, 'captureMessage').mockImplementation(() => undefined);
  afterEach(() => capture.mockClear());

  it('snapshot: reads redis ping, dead-letter depth, pending count and oldest age', async () => {
    const { svc } = build({ dead: 2, pending: 3, oldestAgeSec: 90, redis: false, rabbit: true });
    expect(await svc.snapshot()).toEqual({ redisUp: false, rabbitmqUp: true, outboxPending: 3, outboxOldestPendingSec: 90, deadLetters: 2 });
  });

  it('refresh: sets the gauges; /metrics text contains them', async () => {
    const { svc } = build({ dead: 1, pending: 2, oldestAgeSec: 5 });
    await svc.refresh();
    const text = await svc.registry.metrics();
    expect(text).toMatch(/maxone_dead_letters 1/);
    expect(text).toMatch(/maxone_outbox_pending 2/);
    expect(text).toMatch(/maxone_redis_up 1/);
    expect(text).toMatch(/maxone_rabbitmq_up 1/);
  });

  it('alerts ONCE on the transition into breach, not on every tick, and logs recovery', async () => {
    const { svc, queue, error, info } = build({ dead: 1 });
    await svc.refresh();
    await svc.refresh();
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0][0]).toMatch(/ALERT dead-letters/);
    expect(capture).toHaveBeenCalledTimes(1);
    queue.depth.mockResolvedValue(0);
    await svc.refresh();
    expect(info).toHaveBeenCalledWith('RECOVERED dead-letters');
    await svc.refresh();
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('outbox-stuck breaches only past 60s of pending age', async () => {
    const { svc, error } = build({ pending: 1, oldestAgeSec: 30 });
    await svc.refresh();
    expect(error).not.toHaveBeenCalled();
    const stuck = build({ pending: 1, oldestAgeSec: 120 });
    await stuck.svc.refresh();
    expect(stuck.error.mock.calls[0][0]).toMatch(/ALERT outbox-stuck/);
  });

  it('a failing snapshot is logged, not thrown, and returns null', async () => {
    const { svc, prisma } = build();
    prisma.outboxEvent.count.mockRejectedValue(new Error('db gone'));
    await expect(svc.refresh()).resolves.toBeNull();
  });
});
