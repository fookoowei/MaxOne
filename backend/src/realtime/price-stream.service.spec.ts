import { PriceStreamService } from './price-stream.service';

const btc = { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 43000, change24h: 2 };

function build(connected: number, assets: any[] = [btc]) {
  const markets = { list: jest.fn().mockResolvedValue(assets) };
  const realtime = { connectedCount: jest.fn().mockReturnValue(connected), broadcastPrices: jest.fn() };
  const service = new PriceStreamService(markets as any, realtime as any);
  return { service, markets, realtime };
}

describe('PriceStreamService.tick', () => {
  it('does nothing when no clients are connected (cost guard)', async () => {
    const { service, markets, realtime } = build(0);
    await service.tick();
    expect(markets.list).not.toHaveBeenCalled();
    expect(realtime.broadcastPrices).not.toHaveBeenCalled();
  });

  it('broadcasts the fetched assets when clients are connected', async () => {
    const { service, markets, realtime } = build(2);
    await service.tick();
    expect(markets.list).toHaveBeenCalledTimes(1);
    expect(realtime.broadcastPrices).toHaveBeenCalledWith([btc]);
  });

  it('does not broadcast when the fetch returns no assets', async () => {
    const { service, realtime } = build(2, []);
    await service.tick();
    expect(realtime.broadcastPrices).not.toHaveBeenCalled();
  });
});
