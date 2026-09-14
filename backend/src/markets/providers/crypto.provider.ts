import { Injectable, Logger } from '@nestjs/common';
import { COINS } from '../market-asset';
import { pickResult } from './kraken-shape';

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
        this.log.warn(`Kraken ${res.status} for ${path}: ${body.slice(0, 200)}`);
        return null;
      }
      const body = (await res.json()) as { error?: string[]; result?: T };
      if (body.error?.length) {
        this.log.warn(`Kraken error for ${path}: ${body.error.join(', ')}`);
        return null;
      }
      return body.result ?? null;
    } catch (err) {
      this.log.warn(`Kraken ${path} failed: ${(err as Error).message}`);
      return null;
    }
  }

  // Every coin in ONE call. h[1]/l[1] are the rolling 24h figures (h[0]/l[0] are "today" in UTC,
  // which is not the same thing and is not what the UI promises).
  async fetchTickers(): Promise<Ticker[]> {
    const pairs = COINS.map((c) => c.krakenPair).join(',');
    const result = await this.get<Record<string, KrakenTickerRow>>(
      `/Ticker?pair=${pairs}`,
    );
    if (!result) return [];
    const out: Ticker[] = [];
    for (const coin of COINS) {
      const row = pickResult<KrakenTickerRow>(result, coin.krakenBase);
      if (!row) continue; // a missing coin is skipped, never zero-filled
      out.push({
        symbol: coin.symbol,
        price: Number(row.c[0]),
        high24h: Number(row.h[1]),
        low24h: Number(row.l[1]),
      });
    }
    return out;
  }
}
