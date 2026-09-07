import { ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RatesService } from './rates.service';

// A minimal stand-in for the parts of the fetch Response we use.
const fakeResponse = (body: any, ok = true) =>
  ({ ok, json: () => Promise.resolve(body) }) as unknown as Response;

/** Pass-through cache: always a miss, stores nothing — the fetch path is what these tests cover. */
const noCache = { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() } as any;

describe('RatesService', () => {
  const service = new RatesService(noCache);

  afterEach(() => jest.restoreAllMocks());

  it('parses the rate for the requested pair', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(fakeResponse({ rates: { EUR: 0.9234 } }));
    const rate = await service.getRate('USD', 'EUR');
    expect(rate.toString()).toBe('0.9234');
  });

  it('short-circuits same-currency to 1 without hitting the network', async () => {
    const spy = jest.spyOn(global, 'fetch');
    const rate = await service.getRate('USD', 'USD');
    expect(rate.toString()).toBe('1');
    expect(spy).not.toHaveBeenCalled();
  });

  it('throws 503 when the provider returns a non-200', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(fakeResponse({}, false));
    await expect(service.getRate('USD', 'EUR')).rejects.toThrow(ServiceUnavailableException);
  });

  it('throws 503 when the network call itself fails', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(service.getRate('USD', 'EUR')).rejects.toThrow(ServiceUnavailableException);
  });

  it('throws 503 when the pair is absent from the response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(fakeResponse({ rates: {} }));
    await expect(service.getRate('USD', 'XYZ')).rejects.toThrow(ServiceUnavailableException);
  });

  it('serves a cached rate as a Decimal without touching the network (60s under rates:<from>:<to>)', async () => {
    const wrap = jest.fn().mockResolvedValue('0.9234'); // a hit: the stored string form
    const cached = new RatesService({ wrap } as any);
    const spy = jest.spyOn(global, 'fetch');
    const rate = await cached.getRate('USD', 'EUR');
    expect(rate).toBeInstanceOf(Prisma.Decimal);
    expect(rate.toString()).toBe('0.9234');
    expect(spy).not.toHaveBeenCalled();
    expect(wrap).toHaveBeenCalledWith('rates:USD:EUR', 60, expect.any(Function));
  });

  it('quotes a cross-currency conversion', async () => {
    jest.spyOn(service, 'getRate').mockResolvedValue(new Prisma.Decimal('0.87781'));
    const q = await service.quote('USD', 'EUR', 50000);
    expect(q).toEqual({ from: 'USD', to: 'EUR', amount: 50000, rate: '0.87781', converted: 43890 });
  });

  it('quotes same-currency as rate 1 with no conversion', async () => {
    const q = await service.quote('USD', 'USD', 5000);
    expect(q).toEqual({ from: 'USD', to: 'USD', amount: 5000, rate: '1', converted: 5000 });
  });
});
