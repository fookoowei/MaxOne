import { forwardRef, Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

@Module({
  // PermissionsGuard reads the actor's permissions from the DB via UsersService.
  // forwardRef: UsersModule imports AuditModule (Task 5) and AuditModule imports UsersModule
  // (this task) — a cycle NestJS can only resolve if BOTH sides defer.
  imports: [forwardRef(() => UsersModule)],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
