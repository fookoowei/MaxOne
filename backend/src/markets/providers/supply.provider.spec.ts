import { Logger } from '@nestjs/common';
import { SupplyProvider } from './supply.provider';

describe('SupplyProvider', () => {
  const provider = new SupplyProvider();
  beforeEach(() => jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('maps CoinLore rows to circulating supply keyed by our symbol', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: '90', symbol: 'BTC', csupply: '19970852.00' },
        { id: '80', symbol: 'ETH', csupply: '120000000.00' },
      ]),
    } as unknown as Response);

    expect(await provider.fetchSupply()).toEqual({ BTC: 19970852, ETH: 120000000 });
  });

  it('fails soft ({}) so the page still renders without market cap', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('down'));
    expect(await provider.fetchSupply()).toEqual({});
  });

  it('logs a non-OK response instead of swallowing it', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false, status: 429, text: () => Promise.resolve('slow down'),
    } as unknown as Response);

    expect(await provider.fetchSupply()).toEqual({});
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('429'));
  });

  it('omits coins with zero supply', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: '90', symbol: 'BTC', csupply: '19970852.00' },
        { id: '80', symbol: 'ETH', csupply: '0' },
      ]),
    } as unknown as Response);

    expect(await provider.fetchSupply()).toEqual({ BTC: 19970852 });
  });

  it('omits coins with unparseable supply', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: '90', symbol: 'BTC', csupply: '19970852.00' },
        { id: '80', symbol: 'ETH', csupply: 'N/A' },
      ]),
    } as unknown as Response);

    expect(await provider.fetchSupply()).toEqual({ BTC: 19970852 });
  });
});
