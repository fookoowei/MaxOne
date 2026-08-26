import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RatesService } from './rates.service';
import { QuoteQueryDto } from './dto/quote-query.dto';

@Controller('rates')
@UseGuards(JwtAuthGuard)
export class RatesController {
  constructor(private readonly rates: RatesService) {}

  @Get('quote')
  quote(@Query() q: QuoteQueryDto) {
    return this.rates.quote(q.from, q.to, q.amount);
  }
}
