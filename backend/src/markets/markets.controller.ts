import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MarketsService } from './markets.service';
import { ChartQueryDto } from './dto/chart-query.dto';

@Controller('markets')
@UseGuards(JwtAuthGuard)
export class MarketsController {
  constructor(private readonly markets: MarketsService) {}

  @Get()
  list() {
    return this.markets.list();
  }

  // Declared before @Get(':id') so the two-segment path is matched first.
  @Get(':id/chart')
  chart(@Param('id') id: string, @Query() q: ChartQueryDto) {
    return this.markets.chart(id, q.days);
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const asset = await this.markets.detail(id);
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }
}
