import { MarketsService } from './markets.service';
import type { Candle } from './market-asset';

const candles = (closes: number[]): Candle[] =>
  closes.map((c, i) => ({ t: i * 3600, o: c, h: c, l: c, c }));

// A cache that really caches AND really expires, so "is an empty result cached, and for how
// long?" is a behavioural question rather than one answered by inspecting call args.
let now = 0;
const store = new Map<string, { value: unknown; expiresAt: number }>();
const cache = {
  wrap: async <T>(
    key: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
    cacheable: (value: T) => boolean | number = () => true,
  ): Promise<T> => {
    const hit = store.get(key);
    if (hit && hit.expiresAt > now) return hit.value as T;
    const value = await fn();
    const decision = cacheable(value);
    if (decision !== false) {
      const ttl = typeof decision === 'number' ? decision : ttlSeconds;
      store.set(key, { value, expiresAt: now + ttl * 1000 });
    }
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
    now = 0;
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
    // The ticker cache is warm from list() above; a live upstream change must NOT reach detail()
    // until that cache expires — otherwise this test would pass even if list()/detail() each hit
    // the provider independently instead of sharing tickers().
    crypto.fetchTickers.mockResolvedValue([
      { symbol: 'BTC', price: 999, high24h: 999, low24h: 999 },
    ]);
    expect((await service.detail('bitcoin'))?.price).toBe(listed.price);
  });

  it('derives change24h from the live ticker price, not the stale cached candle close', async () => {
    // Candles (from beforeEach) close at 100 x24 then 110. A ticker jump to 121 must flow into
    // change24h via the restated open candle, not stay pinned to the 110 close.
    crypto.fetchTickers.mockResolvedValue([
      { symbol: 'BTC', price: 121, high24h: 130, low24h: 100 },
    ]);
    const [listed] = await service.list();
    expect(listed.change24h).toBe(21); // (121 - 100) / 100 * 100, not (110 - 100) / 100 * 100
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

  it('caches a good result, so N callers cost one upstream call', async () => {
    await service.list();
    await service.list();
    expect(crypto.fetchTickers).toHaveBeenCalledTimes(1);
  });

  it('does not re-hit the provider for a second immediate call during an outage', async () => {
    crypto.fetchTickers.mockResolvedValue([]);
    await service.list();
    await service.list(); // same instant — must be served from the negative cache
    expect(crypto.fetchTickers).toHaveBeenCalledTimes(1);
  });

  it('does not pin an empty result for a full TTL — it is refetched once the short negative-cache window passes', async () => {
    crypto.fetchTickers.mockResolvedValue([]);
    await service.list();
    now += 9_000; // past the negative-cache window, still well inside the 15s ticker TTL
    await service.list();
    expect(crypto.fetchTickers).toHaveBeenCalledTimes(2); // refetched, not served stale
  });
});
