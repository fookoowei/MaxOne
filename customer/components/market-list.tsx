import { formatPrice } from '@/lib/format/price';

export interface MarketAsset {
  symbol: string;
  name: string;
  type: 'crypto' | 'stock';
  price: number;
  change24h: number;
}

export function MarketList({ assets }: { assets: MarketAsset[] }) {
  if (assets.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Markets are unavailable right now.</p>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {assets.map((a) => (
        <li key={`${a.type}:${a.symbol}`} className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium">{a.name}</p>
            <p className="text-xs text-muted-foreground">{a.symbol}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">{formatPrice(a.price)}</p>
            <p
              className={`text-xs tabular-nums ${
                a.change24h >= 0 ? 'text-emerald-600' : 'text-destructive'
              }`}
            >
              {a.change24h >= 0 ? '+' : ''}
              {a.change24h.toFixed(2)}%
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
