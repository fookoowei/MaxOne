import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PushModule } from '../push/push.module';
import { QueueModule } from '../queue/queue.module';
import { CacheModule } from '../cache/cache.module';
import { LoggingModule } from '../logging/logging.module';
import { NotificationConsumer } from './notification.consumer';

/**
 * Only what the consumer needs. Booting AppModule here would start the Socket.IO gateway (no HTTP
 * server to attach to) and a second price tick (double-polling CoinGecko).
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../.env' }),
    LoggingModule, // M17: same JSON logs as the API (SERVICE_NAME=worker)
    PrismaModule,
    PushModule,
    QueueModule,
    CacheModule, // M16c: dedupe marks (mq:done:<id>) live in Redis
  ],
  providers: [NotificationConsumer],
})
export class WorkerModule {}
