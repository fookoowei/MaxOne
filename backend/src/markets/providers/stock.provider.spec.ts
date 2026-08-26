import { StockProvider } from './stock.provider';

describe('StockProvider', () => {
  const provider = new StockProvider();
  const original = process.env.FINNHUB_API_KEY;
  afterEach(() => {
    jest.restoreAllMocks();
    if (original === undefined) delete process.env.FINNHUB_API_KEY;
    else process.env.FINNHUB_API_KEY = original;
  });

  it('returns [] when no API key is set (keyless dev)', async () => {
    delete process.env.FINNHUB_API_KEY;
    const spy = jest.spyOn(global, 'fetch');
    expect(await provider.fetchAssets()).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('maps Finnhub quotes to normalized MarketAssets', async () => {
    process.env.FINNHUB_API_KEY = 'test-key';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ c: 189.5, dp: -1.1 }),
    } as unknown as Response);

    const assets = await provider.fetchAssets();

    expect(assets[0]).toEqual({
      symbol: 'AAPL',
      name: 'Apple Inc.',
      type: 'stock',
      price: 189.5,
      change24h: -1.1,
    });
    expect(assets.every((a) => a.type === 'stock')).toBe(true);
  });

  it('skips a symbol whose fetch fails, without throwing', async () => {
    process.env.FINNHUB_API_KEY = 'test-key';
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('rate limit'));
    expect(await provider.fetchAssets()).toEqual([]);
  });
});
