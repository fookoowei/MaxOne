import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { CacheModule } from './cache/cache.module';
import { QueueModule } from './queue/queue.module';
import { OutboxModule } from './outbox/outbox.module';
import { LoggingModule } from './logging/logging.module';
import { ObservabilityModule } from './observability/observability.module';
import { AdminModule } from './admin/admin.module';
import { InProcessConsumerModule } from './worker/in-process-consumer.module';
import { AuditModule } from './audit/audit.module';
import { MarketsModule } from './markets/markets.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { HoldingsModule } from './holdings/holdings.module';
import { AlertsModule } from './alerts/alerts.module';
import { RealtimeModule } from './realtime/realtime.module';
import { PushModule } from './push/push.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../.env' }),
    LoggingModule, // M17: pino JSON logs + request id
    // Global default: 100 requests/minute/IP (ttl is in ms). In-memory store — single instance.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    // Enables @Interval/@Cron jobs (e.g. the live price stream).
    ScheduleModule.forRoot(),
    PrismaModule,
    UsersModule,
    WalletsModule,
    HealthModule,
    AuthModule,
    AuditModule,
    MarketsModule,
    WatchlistModule,
    HoldingsModule,
    AlertsModule,
    RealtimeModule,
    PushModule,
    CacheModule, // M16a: global, fail-soft Redis cache-aside
    QueueModule, // M16b: global, fail-soft RabbitMQ publisher (the worker consumes)
    OutboxModule, // M16d: transactional outbox relay (API only — the worker never loads it)
    ObservabilityModule, // M17: /metrics + 30s ops-watch (API only)
    AdminModule, // M18b: staff dashboard overview
    // Free-tier deploy option: run the queue consumer INSIDE the API process instead of a separate
    // (paid) worker. Same code, same queue, same retries/outbox — only the process boundary differs.
    ...(process.env.CONSUMER_IN_PROCESS === 'true' ? [InProcessConsumerModule] : []),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply the throttler to every route (unless a route overrides its limit).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // One error shape for every response (M15c): { statusCode, code, message, path, timestamp }.
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
