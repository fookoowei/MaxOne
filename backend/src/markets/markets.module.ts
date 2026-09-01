import { Module } from '@nestjs/common';
import { MarketsService } from './markets.service';
import { MarketsController } from './markets.controller';
import { CryptoProvider } from './providers/crypto.provider';

@Module({
  controllers: [MarketsController],
  providers: [MarketsService, CryptoProvider],
  exports: [MarketsService],
})
export class MarketsModule {}
