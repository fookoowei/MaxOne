import { MarketsService } from './markets.service';
import type { Candle } from './market-asset';

const candles = (closes: number[]): Candle[] =>
  closes.map((c, i) => ({ t: i * 3600, o: c, h: c, l: c, c }));

// A cache that really caches, so "is an empty result cached?" is a behavioural question.
const store = new Map<string, unknown>();
const cache = {
  wrap: async <T>(
    key: string,
    _ttl: number,
    fn: () => Promise<T>,
    cacheable: (value: T) => boolean = () => true,
  ): Promise<T> => {
    if (store.has(key)) return store.get(key) as T;
    const value = await fn();
    if (cacheable(value)) store.set(key, value);
    return value;
  },
};

describe('MarketsService', () => {
  const crypto = {
    fetchTickers: jest.fn(),
    fetchCandles: jest.fn(),
  };
  const supply = { fetchSupply: jest.fn() };
  const service = new MarketsService(
    crypto as never,
    supply as never,
    cache as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    store.clear();
    crypto.fetchTickers.mockResolvedValue([
      { symbol: 'BTC', price: 110, high24h: 120, low24h: 90 },
    ]);
    crypto.fetchCandles.mockResolvedValue(candles([...Array(24).fill(100), 110]));
    supply.fetchSupply.mockResolvedValue({ BTC: 20_000_000 });
  });

  it('lists assets with names from the static table and change derived from 1h candles', async () => {
    expect(await service.list()).toEqual([
      expect.objectContaining({ id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 110, change24h: 10 }),
    ]);
  });

  it('drops coins the ticker did not return', async () => {
    crypto.fetchTickers.mockResolvedValue([]);
    expect(await service.list()).toEqual([]);
  });

  it('computes market cap from the LIVE price, not a provider snapshot', async () => {
    const detail = await service.detail('bitcoin');
    expect(detail?.marketCap).toBe(110 * 20_000_000);
  });

  it('takes the detail price from the same source as the list, so they cannot drift', async () => {
    const [listed] = await service.list();
    expect((await service.detail('bitcoin'))?.price).toBe(listed.price);
  });

  it('returns null for an unknown id', async () => {
    expect(await service.detail('nope')).toBeNull();
  });

  it('ends the chart at the live price on every range (the open candle is restated)', async () => {
    for (const range of ['1m', '1h', '1D'] as const) {
      const { candles: out } = await service.chart('bitcoin', range);
      expect(out.at(-1)?.c).toBe(110);
    }
  });

  it('leaves closed candles untouched', async () => {
    const { candles: out } = await service.chart('bitcoin', '1h');
    expect(out[0]).toEqual({ t: 0, o: 100, h: 100, l: 100, c: 100 });
  });

  it('returns an empty chart for an unknown id', async () => {
    expect(await service.chart('nope', '1h')).toEqual({ candles: [] });
  });

  it('never caches an empty provider result (an outage is not pinned for a TTL)', async () => {
    crypto.fetchTickers.mockResolvedValue([]);
    await service.list();
    await service.list();
    expect(crypto.fetchTickers).toHaveBeenCalledTimes(2); // refetched, not served stale
  });

  it('caches a good result, so N callers cost one upstream call', async () => {
    await service.list();
    await service.list();
    expect(crypto.fetchTickers).toHaveBeenCalledTimes(1);
  });
});
