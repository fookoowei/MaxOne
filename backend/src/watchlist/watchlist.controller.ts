import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { WatchlistService } from './watchlist.service';
import { AddWatchlistDto } from './dto/add-watchlist.dto';

// Ownership-scoped via @CurrentUser(): a user only ever sees/edits their own watchlist.
@Controller('watchlist')
@UseGuards(JwtAuthGuard)
export class WatchlistController {
  constructor(private readonly watchlist: WatchlistService) {}

  @Get()
  list(@CurrentUser() actor: AuthUser) {
    return this.watchlist.list(actor);
  }

  @Post()
  add(@CurrentUser() actor: AuthUser, @Body() dto: AddWatchlistDto) {
    return this.watchlist.add(actor, dto);
  }

  @Delete(':symbol')
  @HttpCode(204)
  async remove(@CurrentUser() actor: AuthUser, @Param('symbol') symbol: string) {
    await this.watchlist.remove(actor, symbol);
  }
}
