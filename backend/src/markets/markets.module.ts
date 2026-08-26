import { Module } from '@nestjs/common';
import { MarketsService } from './markets.service';
import { MarketsController } from './markets.controller';
import { CryptoProvider } from './providers/crypto.provider';
import { StockProvider } from './providers/stock.provider';

@Module({
  controllers: [MarketsController],
  providers: [MarketsService, CryptoProvider, StockProvider],
})
export class MarketsModule {}
