import { MarketsService } from './markets.service';
import { MarketAsset } from './market-asset';

const btc: MarketAsset = { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 43000, change24h: 2 };
const aapl: MarketAsset = { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', price: 189, change24h: -1 };

function build(cryptoResult: Promise<MarketAsset[]>, stockResult: Promise<MarketAsset[]>) {
  return new MarketsService(
    { fetchAssets: () => cryptoResult } as any,
    { fetchAssets: () => stockResult } as any,
  );
}

describe('MarketsService.list', () => {
  it('merges both providers (crypto first, then stocks)', async () => {
    const service = build(Promise.resolve([btc]), Promise.resolve([aapl]));
    expect(await service.list()).toEqual([btc, aapl]);
  });

  it('returns the surviving provider when the other throws (graceful degradation)', async () => {
    const service = build(Promise.reject(new Error('coingecko down')), Promise.resolve([aapl]));
    expect(await service.list()).toEqual([aapl]);
  });
});
