import { Logger } from '@nestjs/common';
import { CryptoProvider } from './crypto.provider';

const coingeckoRow = {
  id: 'bitcoin',
  symbol: 'btc',
  name: 'Bitcoin',
  current_price: 43000.5,
  price_change_percentage_24h: 2.34,
};

describe('CryptoProvider', () => {
  const provider = new CryptoProvider();
  afterEach(() => jest.restoreAllMocks());

  it('maps CoinGecko rows to normalized MarketAssets', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([coingeckoRow]),
    } as unknown as Response);

    const assets = await provider.fetchAssets();

    expect(assets).toEqual([
      {
        id: 'bitcoin',
        symbol: 'BTC',
        name: 'Bitcoin',
        type: 'crypto',
        price: 43000.5,
        change24h: 2.34,
      },
    ]);
  });

  it('fails soft (returns []) on a network error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('down'));
    expect(await provider.fetchAssets()).toEqual([]);
  });

  it('fails soft (returns []) on a non-OK response — and says why in the log', async () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Throttled'),
    } as unknown as Response);

    expect(await provider.fetchAssets()).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/CoinGecko 429 .*Throttled/),
    );
  });

  it('is keyless by default, and sends x-cg-demo-api-key when COINGECKO_API_KEY is set', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as unknown as Response);

    delete process.env.COINGECKO_API_KEY;
    await provider.fetchAssets();
    expect(fetchSpy.mock.calls[0][1]).toBeUndefined();

    process.env.COINGECKO_API_KEY = 'demo-123';
    await provider.fetchAssets();
    expect(fetchSpy.mock.calls[1][1]).toEqual({
      headers: { 'x-cg-demo-api-key': 'demo-123' },
    });
    delete process.env.COINGECKO_API_KEY;
  });
});

describe('CryptoProvider.fetchOne', () => {
  const detailRow = {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    current_price: 43000,
    price_change_percentage_24h: 2.34,
    market_cap: 800000000000,
    high_24h: 44000,
    low_24h: 42000,
  };
  const provider = new CryptoProvider();
  afterEach(() => jest.restoreAllMocks());

  it('maps a one-coin markets row to a rich AssetDetail', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([detailRow]),
    } as unknown as Response);

    expect(await provider.fetchOne('bitcoin')).toEqual({
      id: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      type: 'crypto',
      price: 43000,
      change24h: 2.34,
      marketCap: 800000000000,
      high24h: 44000,
      low24h: 42000,
    });
  });

  it('returns null when the coin is not found', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as unknown as Response);
    expect(await provider.fetchOne('nope')).toBeNull();
  });

  it('returns null on error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('down'));
    expect(await provider.fetchOne('bitcoin')).toBeNull();
  });
});

describe('CryptoProvider.fetchChart', () => {
  const provider = new CryptoProvider();
  afterEach(() => jest.restoreAllMocks());

  it('maps CoinGecko prices to points + labels (same length, ordered)', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          prices: [
            [1000, 100],
            [2000, 110],
            [3000, 105],
          ],
        }),
    } as unknown as Response);

    const chart = await provider.fetchChart('bitcoin', 7);

    expect(chart.points).toEqual([100, 110, 105]);
    expect(chart.labels).toHaveLength(3);
  });

  it('fails soft to empty on error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('down'));
    expect(await provider.fetchChart('bitcoin', 7)).toEqual({
      points: [],
      labels: [],
    });
  });
});
