import { Injectable, Logger } from '@nestjs/common';
import {
  AssetDetail,
  ChartData,
  CRYPTO_IDS,
  MarketAsset,
} from '../market-asset';

interface CoinGeckoRow {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  image: string | null; // coin logo URL on CoinGecko's CDN
}

// CoinGecko markets endpoint. Isolated + fail-soft: any failure returns [] so a crypto outage
// never breaks the Markets page. Fail-soft is NOT silent though: every non-OK / thrown call is
// logged with the status + body (prod post-mortem 2026-09-09: Markets showed nothing for days
// because the shared Render egress IP was being refused by CoinGecko and nothing said so).
//
// COINGECKO_API_KEY (optional, free "Demo" key — https://www.coingecko.com/en/api/pricing) is
// sent as `x-cg-demo-api-key`; it lifts the anonymous per-IP limit to a per-key one. Unset = keyless.
@Injectable()
export class CryptoProvider {
  private readonly url = 'https://api.coingecko.com/api/v3/coins/markets';
  private readonly log = new Logger(CryptoProvider.name);

  // One door for every CoinGecko call: key header + failure logging. Returns null when not OK.
  private async get(url: string): Promise<Response | null> {
    const key = process.env.COINGECKO_API_KEY;
    const res = await fetch(
      url,
      key ? { headers: { 'x-cg-demo-api-key': key } } : undefined,
    );
    if (res.ok) return res;
    const body = await res.text().catch(() => '');
    this.log.warn(`CoinGecko ${res.status} for ${url}: ${body.slice(0, 200)}`);
    return null;
  }

  async fetchAssets(): Promise<MarketAsset[]> {
    try {
      const res = await this.get(
        `${this.url}?vs_currency=usd&ids=${CRYPTO_IDS.join(',')}`,
      );
      if (!res) return [];
      const rows = (await res.json()) as CoinGeckoRow[];
      return rows.map((r) => ({
        id: r.id,
        symbol: r.symbol.toUpperCase(),
        name: r.name,
        type: 'crypto' as const,
        price: r.current_price,
        change24h: r.price_change_percentage_24h ?? 0,
        image: r.image ?? undefined,
      }));
    } catch (err) {
      this.log.warn(`CoinGecko list failed: ${(err as Error).message}`);
      return [];
    }
  }

  // One coin, richer fields. Same CoinGecko endpoint filtered to a single id → no over-fetch,
  // works for any coin. null when not found / on error (the controller turns null into a 404).
  async fetchOne(id: string): Promise<AssetDetail | null> {
    try {
      const res = await this.get(`${this.url}?vs_currency=usd&ids=${id}`);
      if (!res) return null;
      const rows = (await res.json()) as (CoinGeckoRow & {
        market_cap: number | null;
        high_24h: number | null;
        low_24h: number | null;
      })[];
      const r = rows[0];
      if (!r) return null;
      return {
        id: r.id,
        symbol: r.symbol.toUpperCase(),
        name: r.name,
        type: 'crypto',
        price: r.current_price,
        change24h: r.price_change_percentage_24h ?? 0,
        image: r.image ?? undefined,
        marketCap: r.market_cap ?? 0,
        high24h: r.high_24h ?? 0,
        low24h: r.low_24h ?? 0,
      };
    } catch (err) {
      this.log.warn(`CoinGecko detail ${id} failed: ${(err as Error).message}`);
      return null;
    }
  }

  private chartLabel(tsMs: number, days: number): string {
    const d = new Date(tsMs);
    return days <= 1
      ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Price history for a coin. Fail-soft → empty (the page shows "Chart unavailable").
  async fetchChart(id: string, days: number): Promise<ChartData> {
    try {
      const res = await this.get(
        `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`,
      );
      if (!res) return { points: [], labels: [] };
      const body = (await res.json()) as { prices?: [number, number][] };
      const prices = body.prices ?? [];
      return {
        points: prices.map(([, p]) => p),
        labels: prices.map(([t]) => this.chartLabel(t, days)),
      };
    } catch (err) {
      this.log.warn(`CoinGecko chart ${id} failed: ${(err as Error).message}`);
      return { points: [], labels: [] };
    }
  }
}
