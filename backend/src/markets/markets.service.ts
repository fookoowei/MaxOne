import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { CryptoProvider } from './providers/crypto.provider';
import { MarketAsset } from './market-asset';

// M16a: every provider call is cache-aside. The 15s TTL matches the price-stream tick, so the tick
// pre-warms `markets:list` and page loads ride it — one CoinGecko call per 15s, however many users.
const LIST_TTL = 15;
const DETAIL_TTL = 15;
const CHART_TTL = 300; // history barely changes

@Injectable()
export class MarketsService {
  constructor(
    private readonly crypto: CryptoProvider,
    private readonly cache: CacheService,
  ) {}

  // Crypto-only for now. CryptoProvider is fail-soft (returns [] on error), so this never throws —
  // and an empty result is never cached (defaultCacheable), so an outage isn't pinned for 15s.
  async list(): Promise<MarketAsset[]> {
    return this.cache.wrap('markets:list', LIST_TTL, () => this.crypto.fetchAssets());
  }

  detail(id: string) {
    return this.cache.wrap(`markets:detail:${id}`, DETAIL_TTL, () => this.crypto.fetchOne(id));
  }

  chart(id: string, days: number) {
    return this.cache.wrap(
      `markets:chart:${id}:${days}`,
      CHART_TTL,
      () => this.crypto.fetchChart(id, days),
      (c) => c.points.length > 0, // "Chart unavailable" is not worth remembering
    );
  }
}
