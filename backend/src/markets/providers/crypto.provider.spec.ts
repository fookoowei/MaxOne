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
      { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 43000.5, change24h: 2.34 },
    ]);
  });

  it('fails soft (returns []) on a network error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('down'));
    expect(await provider.fetchAssets()).toEqual([]);
  });

  it('fails soft (returns []) on a non-OK response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false } as Response);
    expect(await provider.fetchAssets()).toEqual([]);
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
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: () => Promise.resolve([]) } as unknown as Response);
    expect(await provider.fetchOne('nope')).toBeNull();
  });

  it('returns null on error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('down'));
    expect(await provider.fetchOne('bitcoin')).toBeNull();
  });
});
