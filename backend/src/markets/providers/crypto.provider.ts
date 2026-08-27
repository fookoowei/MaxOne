import { Injectable } from '@nestjs/common';
import { CRYPTO_IDS, MarketAsset } from '../market-asset';

interface CoinGeckoRow {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number | null;
}

// CoinGecko markets endpoint — keyless. Isolated + fail-soft: any failure returns [] so a
// crypto outage never breaks the Markets page (stocks still show).
@Injectable()
export class CryptoProvider {
  private readonly url = 'https://api.coingecko.com/api/v3/coins/markets';

  async fetchAssets(): Promise<MarketAsset[]> {
    try {
      const res = await fetch(`${this.url}?vs_currency=usd&ids=${CRYPTO_IDS.join(',')}`);
      if (!res.ok) return [];
      const rows = (await res.json()) as CoinGeckoRow[];
      return rows.map((r) => ({
        id: r.id,
        symbol: r.symbol.toUpperCase(),
        name: r.name,
        type: 'crypto' as const,
        price: r.current_price,
        change24h: r.price_change_percentage_24h ?? 0,
      }));
    } catch {
      return [];
    }
  }
}
