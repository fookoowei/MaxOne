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
  const realtime = { emitAlert: jest.fn() };
  const push = { sendToUser: jest.fn().mockResolvedValue(undefined) };
  return { service: new AlertCheckService(alerts as any, realtime as any, push as any), alerts, realtime, push };
}

describe('AlertCheckService.check', () => {
  it('marks + emits + pushes only newly-crossed alerts', async () => {
    const { service, alerts, realtime, push } = build();
    await service.check([btc]);
    expect(alerts.markTriggered).toHaveBeenCalledWith(['a1']);
    expect(realtime.emitAlert).toHaveBeenCalledTimes(1);
    expect(realtime.emitAlert).toHaveBeenCalledWith('u1', {
      id: 'a1',
      symbol: 'BTC',
      direction: 'above',
      targetPrice: 80000,
      price: 80120,
    });
    expect(push.sendToUser).toHaveBeenCalledWith('u1', expect.objectContaining({ id: 'a1', symbol: 'BTC' }));
  });

  it('pendingCount returns the number of pending alerts', async () => {
    const { service } = build([{ id: 'a1' }, { id: 'a2' }] as any);
    expect(await service.pendingCount()).toBe(2);
  });

  it('does nothing when none cross', async () => {
    const { service, alerts, realtime } = build([
      { id: 'a2', userId: 'u2', symbol: 'BTC', direction: 'above', targetPrice: 90000 },
    ]);
    await service.check([btc]);
    expect(alerts.markTriggered).not.toHaveBeenCalled();
    expect(realtime.emitAlert).not.toHaveBeenCalled();
  });

  it('skips a pending alert whose symbol has no price this tick', async () => {
    const { service, alerts, realtime } = build([
      { id: 'a3', userId: 'u3', symbol: 'DOGE', direction: 'above', targetPrice: 0.1 },
    ]);
    await service.check([btc]);
    expect(alerts.markTriggered).not.toHaveBeenCalled();
    expect(realtime.emitAlert).not.toHaveBeenCalled();
  });
});
