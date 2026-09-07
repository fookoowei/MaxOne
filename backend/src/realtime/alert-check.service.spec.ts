import { AlertCheckService } from './alert-check.service';

const btc = { symbol: 'BTC', price: 80120 };
const pending = [
  { id: 'a1', userId: 'u1', symbol: 'BTC', direction: 'above', targetPrice: 80000 }, // fires
  { id: 'a2', userId: 'u2', symbol: 'BTC', direction: 'above', targetPrice: 90000 }, // no
  { id: 'a3', userId: 'u3', symbol: 'DOGE', direction: 'above', targetPrice: 0.1 }, // no price
];

function build(pendingRows: any[] = pending) {
  const alerts = {
    findPending: jest.fn().mockResolvedValue(pendingRows),
    markTriggered: jest.fn().mockResolvedValue({ count: 0 }),
  };
  const notify = {
    enqueue: jest.fn(async (_tx: unknown, userId: string, payload: unknown) => ({ id: 'evt', userId, payload })),
    dispatch: jest.fn().mockResolvedValue(undefined),
  };
  const tx = { tag: 'tx' };
  const prisma = { $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)) };
  return { service: new AlertCheckService(alerts as any, notify as any, prisma as any), alerts, notify, tx };
}

describe('AlertCheckService.check', () => {
  it('marks + notifies only newly-crossed alerts', async () => {
    const { service, alerts, notify, tx } = build();
    await service.check([btc]);
    // Mark + enqueue share ONE transaction client; dispatch runs after it resolves.
    expect(alerts.markTriggered).toHaveBeenCalledWith(['a1'], tx);
    expect(notify.enqueue).toHaveBeenCalledTimes(1);
    expect(notify.enqueue).toHaveBeenCalledWith(
      tx,
      'u1',
      expect.objectContaining({ title: expect.stringContaining('BTC'), url: '/alerts', tag: 'a1' }),
    );
    expect(notify.dispatch).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1' }));
  });

  it('pendingCount returns the number of pending alerts', async () => {
    const { service } = build([{ id: 'a1' }, { id: 'a2' }] as any);
    expect(await service.pendingCount()).toBe(2);
  });

  it('does nothing when none cross', async () => {
    const { service, alerts, notify } = build([
      { id: 'a2', userId: 'u2', symbol: 'BTC', direction: 'above', targetPrice: 90000 },
    ]);
    await service.check([btc]);
    expect(alerts.markTriggered).not.toHaveBeenCalled();
    expect(notify.enqueue).not.toHaveBeenCalled();
  });

  it('skips a pending alert whose symbol has no price this tick', async () => {
    const { service, alerts, notify } = build([
      { id: 'a3', userId: 'u3', symbol: 'DOGE', direction: 'above', targetPrice: 0.1 },
    ]);
    await service.check([btc]);
    expect(alerts.markTriggered).not.toHaveBeenCalled();
    expect(notify.enqueue).not.toHaveBeenCalled();
  });
});
