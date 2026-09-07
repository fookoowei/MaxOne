import { MarketsService } from './markets.service';
import { MarketAsset } from './market-asset';

const btc: MarketAsset = { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 43000, change24h: 2 };

/** Cache stand-in: remembers what was stored (and with which TTL) so the next call is a hit. */
function fakeCache() {
  const store = new Map<string, unknown>();
  const ttls = new Map<string, number>();
  return {
    store,
    ttls,
    wrap: async (key: string, ttl: number, fn: () => Promise<unknown>, cacheable = (v: unknown) => v != null && !(Array.isArray(v) && v.length === 0)) => {
      if (store.has(key)) return store.get(key);
      const v = await fn();
      if (cacheable(v as never)) {
        store.set(key, v);
        ttls.set(key, ttl);
      }
      return v;
    },
  };
}

describe('MarketsService.list', () => {
  it('returns the crypto provider assets', async () => {
    const service = new MarketsService({ fetchAssets: () => Promise.resolve([btc]) } as any, fakeCache() as any);
    expect(await service.list()).toEqual([btc]);
  });

  it('returns [] when the provider is empty (fail-soft — never throws)', async () => {
    const service = new MarketsService({ fetchAssets: () => Promise.resolve([]) } as any, fakeCache() as any);
    expect(await service.list()).toEqual([]);
  });

  it('caches the list under markets:list for 15s — the provider is hit once for two calls', async () => {
    const cache = fakeCache();
    const fetchAssets = jest.fn().mockResolvedValue([btc]);
    const service = new MarketsService({ fetchAssets } as any, cache as any);
    await service.list();
    await service.list();
    expect(fetchAssets).toHaveBeenCalledTimes(1);
    expect(cache.ttls.get('markets:list')).toBe(15);
  });
});

describe('MarketsService.detail / chart', () => {
  it('keys detail and chart by id (and days) with their own TTLs', async () => {
    const cache = fakeCache();
    const provider = {
      fetchOne: jest.fn().mockResolvedValue({ ...btc, marketCap: 1, high24h: 1, low24h: 1 }),
      fetchChart: jest.fn().mockResolvedValue({ points: [1, 2], labels: ['a', 'b'] }),
    };
    const service = new MarketsService(provider as any, cache as any);
    await service.detail('bitcoin');
    await service.chart('bitcoin', 7);
    expect(cache.ttls.get('markets:detail:bitcoin')).toBe(15);
    expect(cache.ttls.get('markets:chart:bitcoin:7')).toBe(300);
  });

  it('does not cache an empty chart ("Chart unavailable" is retried next time)', async () => {
    const cache = fakeCache();
    const provider = { fetchChart: jest.fn().mockResolvedValue({ points: [], labels: [] }) };
    const service = new MarketsService(provider as any, cache as any);
    await service.chart('bitcoin', 1);
    await service.chart('bitcoin', 1);
    expect(provider.fetchChart).toHaveBeenCalledTimes(2);
    expect(cache.store.size).toBe(0);
  });
});
