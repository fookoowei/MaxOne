import { INestApplication } from '@nestjs/common';
import { CacheService } from '../../src/cache/cache.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RatesService } from '../../src/rates/rates.service';
import { bootApp, resetDb, TestRedis } from './db';

// M16a against a REAL Redis (db index 1): the unit fake proves the logic, this proves the wiring —
// JSON round-trip, TTLs actually set, and a service riding the cache end to end.
describe('CacheService against a real Redis', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: TestRedis;
  let cache: CacheService;

  beforeAll(async () => {
    ({ app, prisma, redis } = await bootApp());
    cache = app.get(CacheService);
  });
  beforeEach(() => resetDb(prisma, redis));
  afterEach(() => jest.restoreAllMocks());
  afterAll(() => app.close());

  it('set/get round-trips JSON and the key carries the TTL', async () => {
    await cache.set('k', { a: 1, list: [1, 2] }, 15);
    expect(await cache.get('k')).toEqual({ a: 1, list: [1, 2] });
    expect(await redis.get('k')).toBe('{"a":1,"list":[1,2]}');
    const ttl = await redis.ttl('k');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(15);
  });

  it('wrap: two calls, one execution of fn', async () => {
    const fn = jest.fn().mockResolvedValue({ symbol: 'BTC' });
    await cache.wrap('markets:list', 15, fn);
    await cache.wrap('markets:list', 15, fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('RatesService: second getRate is served from rates:USD:EUR without a network call', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => ({ rates: { EUR: 0.9234 } }) } as unknown as Response);
    const rates = app.get(RatesService);
    expect((await rates.getRate('USD', 'EUR')).toString()).toBe('0.9234');
    expect((await rates.getRate('USD', 'EUR')).toString()).toBe('0.9234');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(await redis.get('rates:USD:EUR')).toBe('"0.9234"'); // the JSON string form
    expect(await redis.ttl('rates:USD:EUR')).toBeLessThanOrEqual(60);
  });
});
