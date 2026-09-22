import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { CryptoProvider, type Ticker } from './providers/crypto.provider';
import { SupplyProvider } from './providers/supply.provider';
import { changeFromCandles, marketCap, restateOpenCandle } from './candle-math';
import {
  AssetDetail,
  Candle,
  ChartData,
  Coin,
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
//  - NEGATIVE_TTL: an outage result is cached too, just briefly — "never pinned for a TTL" does
//    NOT mean "never cached at all". list() alone costs one /Ticker plus one /OHLC per coin; with
//    no cache at all, a Kraken outage means every single page view and every 15s tick re-runs the
//    full fan-out, hitting the upstream hardest exactly when it is already failing (and turning a
//    transient 429 into a self-inflicted IP ban). A few seconds of negative caching absorbs that
//    stampede while still recovering within one tick of the outage actually clearing.
const TICKER_TTL = 15;
const CANDLE_TTL = 60;
const SUPPLY_TTL = 3600;
const NEGATIVE_TTL = 8;

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
      (t) => t.length > 0 || NEGATIVE_TTL, // an outage is cached briefly, never for a full TTL
    );
  }

  private candles(id: string, range: Range): Promise<Candle[]> {
    const coin = coinById(id);
    if (!coin) return Promise.resolve([]);
    return this.cache.wrap(
      `markets:candles:${id}:${range}`,
      CANDLE_TTL,
      () => this.crypto.fetchCandles(coin, range),
      (c) => c.length > 0 || NEGATIVE_TTL,
    );
  }

  // Shared by list() and detail(): both need the same MarketAsset shape built from a coin + its
  // ticker. change24h is derived from the candles restated with THIS ticker's price, not the raw
  // cached history — history's last close can be up to CANDLE_TTL stale while `price` comes from
  // the 15s ticker cache, and putting two clocks on one object is exactly the bug this method
  // exists to close (the header price and the % must always agree).
  private async marketAsset(coin: Coin, ticker: Ticker): Promise<MarketAsset> {
    const history = await this.candles(coin.id, '1h');
    return {
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      type: 'crypto',
      price: ticker.price,
      change24h: changeFromCandles(restateOpenCandle(history, ticker.price)),
      image: coin.image,
    };
  }

  async list(): Promise<MarketAsset[]> {
    const tickers = await this.tickers();
    const bySymbol = new Map(tickers.map((t) => [t.symbol, t]));
    return Promise.all(
      COINS.filter((c) => bySymbol.has(c.symbol)).map((coin) =>
        this.marketAsset(coin, bySymbol.get(coin.symbol)!),
      ),
    );
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
    const asset = await this.marketAsset(coin, ticker);
    return {
      ...asset,
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
