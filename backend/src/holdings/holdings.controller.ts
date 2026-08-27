import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { HoldingsService } from './holdings.service';
import { AddHoldingDto } from './dto/add-holding.dto';

@Controller('portfolio')
@UseGuards(JwtAuthGuard)
export class HoldingsController {
  constructor(private readonly holdings: HoldingsService) {}

  @Get()
  list(@CurrentUser() actor: AuthUser) {
    return this.holdings.list(actor);
  }

  @Post()
  add(@CurrentUser() actor: AuthUser, @Body() dto: AddHoldingDto) {
    return this.holdings.add(actor, dto);
  }

  @Delete(':symbol')
  @HttpCode(204)
  async remove(@CurrentUser() actor: AuthUser, @Param('symbol') symbol: string) {
    await this.holdings.remove(actor, symbol);
  }
}
