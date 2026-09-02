import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MarketsModule } from '../markets/markets.module';
import { AlertsModule } from '../alerts/alerts.module';
import { PushModule } from '../push/push.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { NotificationService } from './notification.service';
import { PriceStreamService } from './price-stream.service';
import { AlertCheckService } from './alert-check.service';

// Self-contained JwtModule (same secret as AuthModule) so the gateway can verify WS tickets
// without coupling Realtime to AuthModule.
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
    MarketsModule,
    AlertsModule,
    PushModule,
  ],
  providers: [RealtimeGateway, RealtimeService, NotificationService, PriceStreamService, AlertCheckService],
  exports: [RealtimeService, NotificationService],
})
export class RealtimeModule {}
