import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService, REDIS_CLIENT } from './cache.service';

/**
 * Global so any module can inject CacheService without importing this one. The ioredis client is
 * behind the REDIS_CLIENT token so specs can swap in an in-memory fake.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const client = new Redis(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379/0', {
          lazyConnect: true, // CacheService.onModuleInit connects (and absorbs the failure)
          enableOfflineQueue: false, // while disconnected, commands fail NOW instead of queueing
          maxRetriesPerRequest: 1,
          retryStrategy: (times) => Math.min(times * 500, 10_000), // keep reconnecting, capped backoff
        });
        // An unhandled 'error' event would crash the process; CacheService logs on use instead.
        client.on('error', () => undefined);
        return client;
      },
    },
    CacheService,
  ],
  exports: [CacheService],
})
export class CacheModule {}
