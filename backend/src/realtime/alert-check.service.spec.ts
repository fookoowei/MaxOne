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
  const notify = { notify: jest.fn().mockResolvedValue(undefined) };
  return { service: new AlertCheckService(alerts as any, notify as any), alerts, notify };
}

describe('AlertCheckService.check', () => {
  it('marks + notifies only newly-crossed alerts', async () => {
    const { service, alerts, notify } = build();
    await service.check([btc]);
    expect(alerts.markTriggered).toHaveBeenCalledWith(['a1']);
    expect(notify.notify).toHaveBeenCalledTimes(1);
    expect(notify.notify).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ title: expect.stringContaining('BTC'), url: '/alerts', tag: 'a1' }),
    );
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
    expect(notify.notify).not.toHaveBeenCalled();
  });

  it('skips a pending alert whose symbol has no price this tick', async () => {
    const { service, alerts, notify } = build([
      { id: 'a3', userId: 'u3', symbol: 'DOGE', direction: 'above', targetPrice: 0.1 },
    ]);
    await service.check([btc]);
    expect(alerts.markTriggered).not.toHaveBeenCalled();
    expect(notify.notify).not.toHaveBeenCalled();
  });
});
