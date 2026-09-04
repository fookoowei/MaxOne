import { CacheService, RedisLike } from './cache.service';

/** In-memory stand-in for ioredis: stores strings, records the TTL it was given. */
function fakeRedis(): RedisLike & { store: Map<string, string>; ttls: Map<string, number> } {
  const store = new Map<string, string>();
  const ttls = new Map<string, number>();
  return {
    store,
    ttls,
    get: async (k) => store.get(k) ?? null,
    set: async (k, v, _mode, ttl) => {
      store.set(k, v);
      ttls.set(k, ttl);
    },
    del: async (k) => store.delete(k),
  };
}
const broken: RedisLike = {
  get: async () => { throw new Error('ECONNREFUSED'); },
  set: async () => { throw new Error('ECONNREFUSED'); },
  del: async () => { throw new Error('ECONNREFUSED'); },
};

describe('CacheService', () => {
  it('set stores JSON with the TTL; get parses it back; missing key → null', async () => {
    const redis = fakeRedis();
    const cache = new CacheService(redis);
    await cache.set('k', { a: 1 }, 15);
    expect(redis.store.get('k')).toBe('{"a":1}');
    expect(redis.ttls.get('k')).toBe(15);
    expect(await cache.get('k')).toEqual({ a: 1 });
    expect(await cache.get('nope')).toBeNull();
  });

  it('wrap: miss runs fn and stores it; hit returns the stored value without calling fn', async () => {
    const cache = new CacheService(fakeRedis());
    const fn = jest.fn().mockResolvedValue([{ symbol: 'BTC' }]);
    expect(await cache.wrap('markets:list', 15, fn)).toEqual([{ symbol: 'BTC' }]);
    expect(await cache.wrap('markets:list', 15, fn)).toEqual([{ symbol: 'BTC' }]);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('wrap: null and empty-list results are returned but NOT stored (an outage is never pinned)', async () => {
    const redis = fakeRedis();
    const cache = new CacheService(redis);
    expect(await cache.wrap('a', 15, async () => [])).toEqual([]);
    expect(await cache.wrap('b', 15, async () => null)).toBeNull();
    expect(redis.store.size).toBe(0);
  });

  it('is fail-soft: with Redis down, get → null, set swallows, wrap still returns fn()', async () => {
    const cache = new CacheService(broken);
    const warn = jest.spyOn((cache as any).log, 'warn').mockImplementation(() => undefined);
    expect(await cache.get('k')).toBeNull();
    await expect(cache.set('k', 1, 5)).resolves.toBeUndefined();
    expect(await cache.wrap('k', 5, async () => 'fresh')).toBe('fresh');
    expect(warn).toHaveBeenCalledTimes(1); // same error message → warned once, not per call
  });
});
