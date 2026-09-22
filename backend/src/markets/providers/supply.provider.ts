import { Injectable, Logger } from '@nestjs/common';
import { COINS } from '../market-asset';

interface CoinLoreRow {
  id: string;
  symbol: string;
  csupply: string; // circulating supply, as a string
}

// CoinLore, keyless. Supplies ONE fact Kraken cannot: circulating supply, so market cap can be
// computed from our own live price. Cached for an hour upstream — supply moves glacially.
@Injectable()
export class SupplyProvider {
  private readonly log = new Logger(SupplyProvider.name);

  async fetchSupply(): Promise<Record<string, number>> {
    const ids = COINS.map((c) => c.coinloreId).join(',');
    try {
      const res = await fetch(`https://api.coinlore.net/api/ticker/?id=${ids}`);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.log.warn(`CoinLore ${res.status}: ${body.slice(0, 200)}`);
        return {};
      }
      const rows = (await res.json()) as CoinLoreRow[];
      const out: Record<string, number> = {};
      for (const coin of COINS) {
        const row = rows.find((r) => r.id === coin.coinloreId);
        const supply = Number(row?.csupply);
        if (supply > 0) out[coin.symbol] = supply;
      }
      return out;
    } catch (err) {
      this.log.warn(`CoinLore failed: ${(err as Error).message}`);
      return {};
    }
  }
}
