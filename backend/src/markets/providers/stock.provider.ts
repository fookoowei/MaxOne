import { Injectable } from '@nestjs/common';
import { MarketAsset, STOCKS } from '../market-asset';

interface FinnhubQuote {
  c: number; // current price
  dp: number | null; // percent change
}

// Finnhub quotes — one call per symbol. Server-only key; absent key => stocks omitted (dev/tests
// stay keyless). Per-symbol fail-soft: a failing/empty symbol is skipped, never throws.
@Injectable()
export class StockProvider {
  private readonly url = 'https://finnhub.io/api/v1/quote';

  async fetchAssets(): Promise<MarketAsset[]> {
    const token = process.env.FINNHUB_API_KEY;
    if (!token) return [];

    const results = await Promise.all(
      STOCKS.map(async ({ symbol, name }): Promise<MarketAsset | null> => {
        try {
          const res = await fetch(`${this.url}?symbol=${symbol}&token=${token}`);
          if (!res.ok) return null;
          const q = (await res.json()) as FinnhubQuote;
          if (!q.c) return null; // no price → skip
          return { symbol, name, type: 'stock', price: q.c, change24h: q.dp ?? 0 };
        } catch {
          return null;
        }
      }),
    );
    return results.filter((a): a is MarketAsset => a !== null);
  }
}
