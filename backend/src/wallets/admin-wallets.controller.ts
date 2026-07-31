import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { WalletsService } from './wallets.service';
import { ListWalletsQueryDto } from './dto/list-wallets-query.dto';

// Staff surface: a different door (permission-gated) into the SAME WalletsService as the
// customer routes. `transaction.view_all` — the same coarse gate that guards the approvals
// queue — decides who may browse wallets. Ownership is NOT checked here (that's the customer
// routes' rule); staff own no customer wallets.
@Controller('admin/wallets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('transaction.view_all')
export class AdminWalletsController {
  constructor(private readonly wallets: WalletsService) {}

  @Get()
  list(@Query() query: ListWalletsQueryDto) {
    return this.wallets.listAllWallets(query);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.wallets.getWalletForStaff(id);
  }

  @Get(':id/transactions')
  transactions(@Param('id', ParseUUIDPipe) id: string) {
    return this.wallets.listTransactionsForStaff(id);
  }
}
