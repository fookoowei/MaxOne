import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { AlertsService } from './alerts.service';
import { AddAlertDto } from './dto/add-alert.dto';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  list(@CurrentUser() actor: AuthUser) {
    return this.alerts.list(actor);
  }

  @Post()
  add(@CurrentUser() actor: AuthUser, @Body() dto: AddAlertDto) {
    return this.alerts.add(actor, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    await this.alerts.remove(actor, id);
  }
}
