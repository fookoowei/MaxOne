import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
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

  @Get(':id')
  async detail(@Param('id') id: string) {
    const asset = await this.markets.detail(id);
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }
}
