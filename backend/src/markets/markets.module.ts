import { Module } from '@nestjs/common';
import { MarketsService } from './markets.service';
import { MarketsController } from './markets.controller';
import { CryptoProvider } from './providers/crypto.provider';
import { SupplyProvider } from './providers/supply.provider';

@Module({
  controllers: [MarketsController],
  providers: [MarketsService, CryptoProvider, SupplyProvider],
  exports: [MarketsService],
})
export class MarketsModule {}
