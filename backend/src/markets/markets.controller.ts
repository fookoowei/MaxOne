import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MarketsService } from './markets.service';

@Controller('markets')
@UseGuards(JwtAuthGuard)
export class MarketsController {
  constructor(private readonly markets: MarketsService) {}

  @Get()
  list() {
    return this.markets.list();
  }
}
