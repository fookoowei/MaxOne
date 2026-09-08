import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { OverviewController } from './overview.controller';
import { OverviewService } from './overview.service';

@Module({
  imports: [AuthModule, UsersModule], // the guards (PermissionsGuard resolves UsersService)
  controllers: [OverviewController],
  providers: [OverviewService],
})
export class AdminModule {}
