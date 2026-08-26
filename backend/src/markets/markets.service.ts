import { Injectable } from '@nestjs/common';
import { CryptoProvider } from './providers/crypto.provider';
import { StockProvider } from './providers/stock.provider';
import { MarketAsset } from './market-asset';

@Injectable()
export class MarketsService {
  constructor(
    private readonly crypto: CryptoProvider,
    private readonly stocks: StockProvider,
  ) {}

  // Fan out to both providers; one failing yields the other's assets (informational — never 500).
  async list(): Promise<MarketAsset[]> {
    const settled = await Promise.allSettled([this.crypto.fetchAssets(), this.stocks.fetchAssets()]);
    return settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : []));
  }
}
