import { InProcessConsumerRunner } from './in-process-consumer.module';

function build(connected: boolean) {
  const listeners: (() => void)[] = [];
  const queue = { isConnected: jest.fn().mockReturnValue(connected), onOpen: jest.fn((l: () => void) => listeners.push(l)) };
  const consumer = { start: jest.fn().mockResolvedValue(undefined), stop: jest.fn().mockResolvedValue(undefined) };
  const runner = new InProcessConsumerRunner(queue as any, consumer as any);
  jest.spyOn((runner as any).log, 'log').mockImplementation(() => undefined);
  jest.spyOn((runner as any).log, 'warn').mockImplementation(() => undefined);
  return { runner, queue, consumer, listeners };
}

describe('InProcessConsumerRunner (free-tier: consumer inside the API)', () => {
  it('subscribes at boot when the broker is connected', async () => {
    const { runner, consumer } = build(true);
    runner.onApplicationBootstrap();
    await Promise.resolve();
    expect(consumer.start).toHaveBeenCalledTimes(1);
  });

  it('broker down at boot → no subscribe, no throw; subscribes when the queue opens later', async () => {
    const { runner, consumer, listeners } = build(false);
    runner.onApplicationBootstrap();
    await Promise.resolve();
    expect(consumer.start).not.toHaveBeenCalled();
    listeners.forEach((l) => l()); // QueueService fires onOpen after (re)connect
    await Promise.resolve();
    expect(consumer.start).toHaveBeenCalledTimes(1);
  });

  it('re-subscribes on every reconnect (a new channel has no consumer)', async () => {
    const { runner, consumer, listeners } = build(true);
    runner.onApplicationBootstrap();
    listeners.forEach((l) => l());
    await Promise.resolve();
    expect(consumer.start).toHaveBeenCalledTimes(2);
  });

  it('a failing subscribe is logged, never thrown (the API must keep serving)', async () => {
    const { runner, consumer } = build(true);
    consumer.start.mockRejectedValue(new Error('not connected'));
    const warn = (runner as any).log.warn as jest.Mock;
    runner.onApplicationBootstrap();
    await new Promise((r) => setImmediate(r)); // let the rejected promise settle inside subscribe()
    expect(consumer.start).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not subscribe (boot): not connected'));
  });

  it('drains the consumer before shutdown', async () => {
    const { runner, consumer } = build(true);
    await runner.beforeApplicationShutdown();
    expect(consumer.stop).toHaveBeenCalledTimes(1);
  });
});
