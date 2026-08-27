import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { MarketsModule } from './markets/markets.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { HoldingsModule } from './holdings/holdings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../.env' }),
    // Global default: 100 requests/minute/IP (ttl is in ms). In-memory store — single instance.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    UsersModule,
    WalletsModule,
    HealthModule,
    AuthModule,
    AuditModule,
    MarketsModule,
    WatchlistModule,
    HoldingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply the throttler to every route (unless a route overrides its limit).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
