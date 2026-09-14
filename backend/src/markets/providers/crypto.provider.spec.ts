import { Logger } from '@nestjs/common';
import { COINS } from '../market-asset';
import { CryptoProvider } from './crypto.provider';

const ok = (body: unknown) =>
  ({ ok: true, json: () => Promise.resolve(body) }) as unknown as Response;

const tickerBody = {
  error: [],
  result: {
    XXBTZUSD: { c: ['77684.30000', '0.01'], h: ['77000.0', '77829.50000'], l: ['76500.0', '76349.80000'] },
    SOLUSD: { c: ['101.50000', '1.0'], h: ['101.0', '101.93000'], l: ['99.0', '98.95000'] },
  },
};

describe('CryptoProvider.fetchTickers', () => {
  const provider = new CryptoProvider();
  beforeEach(() => jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('maps Kraken rows to tickers, coercing strings and taking the 24h high/low', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(ok(tickerBody));

    const tickers = await provider.fetchTickers();

    expect(tickers).toContainEqual({ symbol: 'BTC', price: 77684.3, high24h: 77829.5, low24h: 76349.8 });
    expect(tickers).toContainEqual({ symbol: 'SOL', price: 101.5, high24h: 101.93, low24h: 98.95 });
  });

  it('skips coins Kraken did not return rather than inventing a zero price', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(ok(tickerBody));
    expect((await provider.fetchTickers()).map((t) => t.symbol)).toEqual(['BTC', 'SOL']);
  });

  it('fails soft (returns []) on a network error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('down'));
    expect(await provider.fetchTickers()).toEqual([]);
  });

  it('logs the status and body when Kraken answers non-OK, then fails soft', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false, status: 403, text: () => Promise.resolve('banned'),
    } as unknown as Response);

    expect(await provider.fetchTickers()).toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('403'));
  });

  it('fails soft when Kraken reports an error array', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(ok({ error: ['EQuery:Unknown asset pair'], result: {} }));
    expect(await provider.fetchTickers()).toEqual([]);
  });
});

describe('CryptoProvider.fetchCandles', () => {
  const provider = new CryptoProvider();
  const btc = COINS[0];
  beforeEach(() => jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  const ohlcBody = {
    error: [],
    result: {
      XXBTZUSD: [
        [1789361700, '77600.0', '77650.0', '77590.0', '77620.0', '77610.0', '5.6', 54],
        [1789361760, '77621.3', '77622.9', '77610.4', '77614.5', '77616.6', '5.6', 54],
      ],
      last: 1789361760,
    },
  };

  it('maps OHLC rows to candles, coercing strings, ignoring vwap/volume/count', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(ok(ohlcBody));

    expect(await provider.fetchCandles(btc, '1m')).toEqual([
      { t: 1789361700, o: 77600, h: 77650, l: 77590, c: 77620 },
      { t: 1789361760, o: 77621.3, h: 77622.9, l: 77610.4, c: 77614.5 },
    ]);
  });

  it('asks Kraken for the interval matching the range', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(ok(ohlcBody));
    await provider.fetchCandles(btc, '4h');
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('interval=240'));
  });

  it('fails soft (returns []) when Kraken is unreachable', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('down'));
    expect(await provider.fetchCandles(btc, '1h')).toEqual([]);
  });
});
