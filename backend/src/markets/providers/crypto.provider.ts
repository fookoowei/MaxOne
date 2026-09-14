import { Injectable, Logger } from '@nestjs/common';
import { COINS, Candle, Coin, KRAKEN_INTERVAL, Range } from '../market-asset';
import { nums, pickResult } from './kraken-shape';

export interface Ticker {
  symbol: string;
  price: number;
  high24h: number;
  low24h: number;
}

interface KrakenTickerRow {
  c: string[]; // [last trade price, lot volume]
  h: string[]; // [today, LAST 24 HOURS]
  l: string[];
}

// Kraken public REST. Keyless on purpose: the CoinGecko era ended when the shared Render egress
// IP was refused without a key (post-mortem 2026-09-09). Fail-soft everywhere, but NEVER silent —
// that outage was invisible for days because nothing logged.
@Injectable()
export class CryptoProvider {
  private readonly base = 'https://api.kraken.com/0/public';
  private readonly log = new Logger(CryptoProvider.name);

  // One door for every Kraken call: HTTP failures AND Kraken's own `error[]` land here.
  private async get<T>(path: string): Promise<T | null> {
    try {
      const res = await fetch(`${this.base}${path}`);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.warn(`Kraken ${res.status} for ${path}: ${body.slice(0, 200)}`);
        return null;
      }
      const body = (await res.json()) as { error?: string[]; result?: T };
      if (body.error?.length) {
        this.warn(`Kraken error for ${path}: ${body.error.join(', ')}`);
        return null;
      }
      return body.result ?? null;
    } catch (err) {
      this.warn(`Kraken ${path} failed: ${(err as Error).message}`);
      return null;
    }
  }

  // Every coin in ONE call. h[1]/l[1] are the rolling 24h figures (h[0]/l[0] are "today" in UTC,
  // which is not the same thing and is not what the UI promises).
  //
  // The whole body is one try/catch, not just the HTTP leg in `get()`: a row that Kraken returns
  // with a field missing (a partial/degraded response, still HTTP 200) throws while mapping, and
  // that throw must not escape past this method — it would otherwise ride all the way up through
  // tickers() -> cache.wrap -> list() into a 500, which is the exact "Markets renders empty"
  // symptom this provider exists to prevent.
  async fetchTickers(): Promise<Ticker[]> {
    try {
      const pairs = COINS.map((c) => c.krakenPair).join(',');
      const result = await this.get<Record<string, KrakenTickerRow>>(
        `/Ticker?pair=${pairs}`,
      );
      if (!result) return [];
      const out: Ticker[] = [];
      for (const coin of COINS) {
        const row = pickResult<KrakenTickerRow>(result, coin.krakenBase);
        if (!row) continue; // a missing coin is skipped, never zero-filled
        const price = Number(row.c[0]);
        const high24h = Number(row.h[1]);
        const low24h = Number(row.l[1]);
        // A coin Kraken returns but with an empty/unparseable price ("" -> 0, "N/A" -> NaN) is
        // just as dangerous as a zero-filled one — a 0 price falsely triggers every "below"
        // alert, a NaN one silently never triggers and renders as $NaN. Skip it, same as a
        // missing coin: never zero- or NaN-filled.
        if (!Number.isFinite(price) || price <= 0) continue;
        out.push({ symbol: coin.symbol, price, high24h, low24h });
      }
      return out;
    } catch (err) {
      this.warn(`Kraken fetchTickers failed: ${(err as Error).message}`);
      return [];
    }
  }

  // 720 candles at any interval, oldest -> newest, in one call. Row shape:
  // [time, open, high, low, close, vwap, volume, count] — all numbers as strings.
  // Same whole-method try/catch as fetchTickers, for the same reason: a degraded 200 (e.g. a row
  // that isn't the array shape we expect) throws while mapping and must fail soft, not 500.
  async fetchCandles(coin: Coin, range: Range): Promise<Candle[]> {
    try {
      const result = await this.get<Record<string, (string | number)[][]>>(
        `/OHLC?pair=${coin.krakenPair}&interval=${KRAKEN_INTERVAL[range]}`,
      );
      if (!result) return [];
      const rows = pickResult<(string | number)[][]>(result);
      if (!rows) return [];
      return rows
        .map((row) => {
          const [t, o, h, l, c] = nums(row);
          return { t, o, h, l, c };
        })
        // A row with a non-numeric field (NaN) is dropped rather than charted: a NaN `t` also
        // makes lightweight-charts' setData throw in the browser.
        .filter((candle) => Object.values(candle).every(Number.isFinite));
    } catch (err) {
      this.warn(`Kraken fetchCandles failed for ${coin.symbol}: ${(err as Error).message}`);
      return [];
    }
  }

  // One warning per distinct message, not one per call — a sustained outage must not flood the
  // log (same pattern as CacheService.warn).
  private lastWarned?: string;
  private warn(msg: string): void {
    if (msg === this.lastWarned) return;
    this.lastWarned = msg;
    this.log.warn(msg);
  }
}
