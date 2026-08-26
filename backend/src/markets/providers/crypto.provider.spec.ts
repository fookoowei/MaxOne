import { CryptoProvider } from './crypto.provider';

const coingeckoRow = {
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
      { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 43000.5, change24h: 2.34 },
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
