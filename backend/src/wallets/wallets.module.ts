import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { RatesModule } from '../rates/rates.module';
import { AuditModule } from '../audit/audit.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { TransactionsController } from './transactions.controller';
import { AdminWalletsController } from './admin-wallets.controller';

@Module({
  imports: [UsersModule, RatesModule, AuditModule, RealtimeModule],
  controllers: [WalletsController, TransactionsController, AdminWalletsController],
  providers: [WalletsService],
})
export class WalletsModule {}
