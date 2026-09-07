import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

export const REDIS_CLIENT = 'REDIS_CLIENT';

/** The slice of ioredis we use. Specs pass an in-memory fake implementing just this. */
export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'EX', ttlSeconds: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
  connect?(): Promise<void>;
  quit?(): Promise<unknown>;
}

/** Only store values worth replaying: no nulls, no empty lists (a provider outage must not get pinned). */
export const defaultCacheable = (value: unknown): boolean =>
  value != null && !(Array.isArray(value) && value.length === 0);

/**
 * Cache-aside over Redis, FAIL-SOFT: if Redis is down every read is a miss and every write is a
 * no-op, so the app behaves exactly as it did before M16a — just uncached. The cache is an
 * optimisation, never a dependency.
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(CacheService.name);
  private lastWarned?: string;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisLike) {}

  // Connect eagerly at boot (a dead Redis fails fast here instead of on the first request).
  async onModuleInit(): Promise<void> {
    await this.redis.connect?.().catch((e: unknown) => this.warn(e));
  }
  // Close the socket so a test app (and a graceful shutdown) doesn't hang on an open handle.
  async onModuleDestroy(): Promise<void> {
    await this.redis.quit?.().catch(() => undefined);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      return raw == null ? null : (JSON.parse(raw) as T);
    } catch (e) {
      this.warn(e);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (e) {
      this.warn(e);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (e) {
      this.warn(e);
    }
  }

  /** Cache-aside: hit → return it; miss → run `fn`, store the result (if cacheable), return it. */
  async wrap<T>(
    key: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
    cacheable: (value: T) => boolean = defaultCacheable,
  ): Promise<T> {
    const hit = await this.get<T>(key);
    if (hit !== null) return hit;
    const value = await fn();
    if (cacheable(value)) await this.set(key, value, ttlSeconds);
    return value;
  }

  // One warning per distinct error, not one per request — a down Redis must not flood the log.
  private warn(e: unknown): void {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === this.lastWarned) return;
    this.lastWarned = msg;
    this.log.warn(`Redis unavailable — running uncached: ${msg}`);
  }
}
