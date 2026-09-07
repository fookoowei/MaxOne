import { OutboxService } from './outbox.service';

const row = { id: 'evt-1', routingKey: 'notification.push', payload: { id: 'evt-1', a: 1 } };

function build(pendingRows: unknown[] = []) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue(pendingRows),
    outboxEvent: { create: jest.fn().mockResolvedValue(row), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  const prisma = {
    $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)),
    outboxEvent: {
      update: jest.fn().mockResolvedValue(row),
      deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
  };
  const queue = { publish: jest.fn().mockReturnValue(true), isConnected: jest.fn().mockReturnValue(true) };
  const svc = new OutboxService(prisma as any, queue as any);
  jest.spyOn((svc as any).log, 'log').mockImplementation(() => undefined);
  jest.spyOn((svc as any).log, 'warn').mockImplementation(() => undefined);
  return { svc, prisma, tx, queue };
}

describe('OutboxService', () => {
  it('enqueue: writes the row through the CALLER\'s transaction client with id = event id', async () => {
    const { svc, tx } = build();
    await svc.enqueue(tx as any, 'notification.push', { id: 'evt-1', a: 1 });
    expect(tx.outboxEvent.create).toHaveBeenCalledWith({
      data: { id: 'evt-1', routingKey: 'notification.push', payload: { id: 'evt-1', a: 1 } },
    });
  });

  it('publishNow: publishes with messageId = row id, then marks the row published', async () => {
    const { svc, prisma, queue } = build();
    expect(await svc.publishNow(row)).toBe(true);
    expect(queue.publish).toHaveBeenCalledWith('notification.push', row.payload, { messageId: 'evt-1' });
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      data: { status: 'published', publishedAt: expect.any(Date) },
    });
  });

  it('publishNow: broker down → row stays pending with attempts+1 and lastError; returns false, never throws', async () => {
    const { svc, prisma, queue } = build();
    queue.publish.mockReturnValue(false);
    expect(await svc.publishNow(row)).toBe(false);
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      data: { attempts: { increment: 1 }, lastError: expect.stringContaining('broker unavailable') },
    });
  });

  it('publishNow: a failing mark is logged, not thrown', async () => {
    const { svc, prisma } = build();
    prisma.outboxEvent.update.mockRejectedValue(new Error('db gone'));
    await expect(svc.publishNow(row)).resolves.toBe(true);
  });

  it('relayPending: selects pending rows FOR UPDATE SKIP LOCKED, publishes each, marks successes and failures separately', async () => {
    const rows = [
      { id: 'p1', routingKey: 'notification.push', payload: { id: 'p1' } },
      { id: 'p2', routingKey: 'notification.push', payload: { id: 'p2' } },
    ];
    const { svc, tx, queue } = build(rows);
    queue.publish.mockReturnValueOnce(true).mockReturnValueOnce(false);
    expect(await svc.relayPending()).toBe(1);
    const sql = (tx.$queryRaw.mock.calls[0][0] as TemplateStringsArray).join('?');
    expect(sql).toMatch(/status = 'pending'/);
    expect(sql).toMatch(/FOR UPDATE SKIP LOCKED/);
    expect(queue.publish).toHaveBeenCalledWith('notification.push', { id: 'p1' }, { messageId: 'p1' });
    expect(tx.outboxEvent.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['p1'] } },
      data: { status: 'published', publishedAt: expect.any(Date) },
    });
    expect(tx.outboxEvent.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['p2'] } },
      data: { attempts: { increment: 1 }, lastError: expect.stringContaining('broker unavailable') },
    });
  });

  it('relayPending: nothing pending → 0, no writes', async () => {
    const { svc, tx } = build([]);
    expect(await svc.relayPending()).toBe(0);
    expect(tx.outboxEvent.updateMany).not.toHaveBeenCalled();
  });

  it('relayPending: skipped while the broker is disconnected (nothing to publish to)', async () => {
    const { svc, prisma, queue } = build([row]);
    queue.isConnected.mockReturnValue(false);
    expect(await svc.relayPending()).toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('relayPending: overlap guard — a second tick during a slow first one is a no-op', async () => {
    const { svc, prisma } = build([row]);
    let release!: (v: unknown) => void;
    prisma.$transaction.mockImplementation(() => new Promise((r) => (release = r)));
    const first = svc.relayPending();
    expect(await svc.relayPending()).toBe(0);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    release(1);
    await first;
  });

  it('purgePublished: deletes only published rows older than 7 days', async () => {
    const { svc, prisma } = build();
    expect(await svc.purgePublished()).toBe(2);
    const arg = prisma.outboxEvent.deleteMany.mock.calls[0][0];
    expect(arg.where.status).toBe('published');
    const ageMs = Date.now() - arg.where.publishedAt.lt.getTime();
    expect(ageMs).toBeGreaterThan(7 * 86_400_000 - 5000);
  });
});
