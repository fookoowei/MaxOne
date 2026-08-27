import { Injectable } from '@nestjs/common';
import { CryptoProvider } from './providers/crypto.provider';
import { MarketAsset } from './market-asset';

@Injectable()
export class MarketsService {
  constructor(private readonly crypto: CryptoProvider) {}

  // Crypto-only for now. CryptoProvider is fail-soft (returns [] on error), so this never throws.
  // Re-adding stocks = inject another provider here and merge via Promise.allSettled.
  async list(): Promise<MarketAsset[]> {
    return this.crypto.fetchAssets();
  }

  detail(id: string) {
    return this.crypto.fetchOne(id);
  }
}
