import { PriceStreamService } from './price-stream.service';

const btc = { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 43000, change24h: 2 };

function build(connected: number, pending: number, assets: any[] = [btc]) {
  const markets = { list: jest.fn().mockResolvedValue(assets) };
  const realtime = { connectedCount: jest.fn().mockReturnValue(connected), broadcastPrices: jest.fn() };
  const alertCheck = {
    pendingCount: jest.fn().mockResolvedValue(pending),
    check: jest.fn().mockResolvedValue(undefined),
  };
  const service = new PriceStreamService(markets as any, realtime as any, alertCheck as any);
  return { service, markets, realtime, alertCheck };
}

describe('PriceStreamService.tick cost guard', () => {
  it('no one watching + no pending → does nothing', async () => {
    const { service, markets, realtime, alertCheck } = build(0, 0);
    await service.tick();
    expect(markets.list).not.toHaveBeenCalled();
    expect(realtime.broadcastPrices).not.toHaveBeenCalled();
    expect(alertCheck.check).not.toHaveBeenCalled();
  });

  it('not watching + pending>0 → fetch + check, NO broadcast', async () => {
    const { service, markets, realtime, alertCheck } = build(0, 2);
    await service.tick();
    expect(markets.list).toHaveBeenCalledTimes(1);
    expect(realtime.broadcastPrices).not.toHaveBeenCalled();
    expect(alertCheck.check).toHaveBeenCalledWith([btc]);
  });

  it('watching + no pending → fetch + broadcast, NO check', async () => {
    const { service, realtime, alertCheck } = build(3, 0);
    await service.tick();
    expect(realtime.broadcastPrices).toHaveBeenCalledWith([btc]);
    expect(alertCheck.check).not.toHaveBeenCalled();
  });

  it('watching + pending>0 → fetch + broadcast + check', async () => {
    const { service, realtime, alertCheck } = build(2, 1);
    await service.tick();
    expect(realtime.broadcastPrices).toHaveBeenCalledWith([btc]);
    expect(alertCheck.check).toHaveBeenCalledWith([btc]);
  });

  it('does not broadcast or check when the fetch returns no assets', async () => {
    const { service, realtime, alertCheck } = build(2, 1, []);
    await service.tick();
    expect(realtime.broadcastPrices).not.toHaveBeenCalled();
    expect(alertCheck.check).not.toHaveBeenCalled();
  });
});
