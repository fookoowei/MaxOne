import { MarketsService } from './markets.service';
import { MarketAsset } from './market-asset';

const btc: MarketAsset = { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 43000, change24h: 2 };

describe('MarketsService.list', () => {
  it('returns the crypto provider assets', async () => {
    const service = new MarketsService({ fetchAssets: () => Promise.resolve([btc]) } as any);
    expect(await service.list()).toEqual([btc]);
  });

  it('returns [] when the provider is empty (fail-soft — never throws)', async () => {
    const service = new MarketsService({ fetchAssets: () => Promise.resolve([]) } as any);
    expect(await service.list()).toEqual([]);
  });
});
