import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { CryptoProvider, type Ticker } from './providers/crypto.provider';
import { SupplyProvider } from './providers/supply.provider';
import { changeFromCandles, marketCap, restateOpenCandle } from './candle-math';
import {
  AssetDetail,
  Candle,
  ChartData,
  COINS,
  coinById,
  MarketAsset,
  Range,
} from './market-asset';

// Cache-aside, with ONE rule: history is immutable, "now" has a single source.
//  - TICKER_TTL matches the 15s price-stream tick, so the tick pre-warms it and every client
//    reads the same "now" — one upstream call per 15s however many users.
//  - CANDLE_TTL covers closed candles only (30 keys total: 5 coins x 6 ranges). The OPEN candle
//    is never served from cache — it is restated from the live price on the way out.
//  - Supply barely changes, so an hour.
const TICKER_TTL = 15;
const CANDLE_TTL = 60;
const SUPPLY_TTL = 3600;

@Injectable()
export class MarketsService {
  constructor(
    private readonly crypto: CryptoProvider,
    private readonly supply: SupplyProvider,
    private readonly cache: CacheService,
  ) {}

  // The one place "now" comes from. Everything else — list, detail, the chart's open candle,
  // the alert check — is derived from this.
  private tickers(): Promise<Ticker[]> {
    return this.cache.wrap(
      'markets:tickers',
      TICKER_TTL,
      () => this.crypto.fetchTickers(),
      (t) => t.length > 0, // an outage is never pinned for a TTL
    );
  }

  private candles(id: string, range: Range): Promise<Candle[]> {
    const coin = coinById(id);
    if (!coin) return Promise.resolve([]);
    return this.cache.wrap(
      `markets:candles:${id}:${range}`,
      CANDLE_TTL,
      () => this.crypto.fetchCandles(coin, range),
      (c) => c.length > 0,
    );
  }

  async list(): Promise<MarketAsset[]> {
    const tickers = await this.tickers();
    const bySymbol = new Map(tickers.map((t) => [t.symbol, t]));
    const assets = await Promise.all(
      COINS.filter((c) => bySymbol.has(c.symbol)).map(async (coin) => ({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        type: 'crypto' as const,
        price: bySymbol.get(coin.symbol)!.price,
        // The 1h candles are cached and shared with the chart page, so this is usually free.
        change24h: changeFromCandles(await this.candles(coin.id, '1h')),
        image: coin.image,
      })),
    );
    return assets;
  }

  async detail(id: string): Promise<AssetDetail | null> {
    const coin = coinById(id);
    if (!coin) return null;
    const ticker = (await this.tickers()).find((t) => t.symbol === coin.symbol);
    if (!ticker) return null;
    const supply = await this.cache.wrap(
      'markets:supply',
      SUPPLY_TTL,
      () => this.supply.fetchSupply(),
      (s) => Object.keys(s).length > 0,
    );
    return {
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      type: 'crypto',
      price: ticker.price,
      change24h: changeFromCandles(await this.candles(coin.id, '1h')),
      image: coin.image,
      marketCap: marketCap(ticker.price, supply[coin.symbol] ?? null),
      high24h: ticker.high24h,
      low24h: ticker.low24h,
    };
  }

  async chart(id: string, range: Range): Promise<ChartData> {
    const coin = coinById(id);
    if (!coin) return { candles: [] };
    const history = await this.candles(id, range);
    const live = (await this.tickers()).find((t) => t.symbol === coin.symbol)?.price ?? 0;
    return { candles: restateOpenCandle(history, live) };
  }
}
