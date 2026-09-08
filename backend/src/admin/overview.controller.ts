import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { OverviewService } from './overview.service';

// Same coarse gate as the approvals queue and the wallets list: if you may see the queue, you may
// see its summary.
@Controller('admin/overview')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('transaction.view_all')
export class OverviewController {
  constructor(private readonly overview: OverviewService) {}

  @Get()
  report() {
    return this.overview.report();
  }
}
