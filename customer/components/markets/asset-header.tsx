import { formatPrice } from '@/lib/format/price';

export interface AssetDetail {
  id: string;
  symbol: string;
  name: string;
  type: 'crypto' | 'stock';
  price: number;
  change24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
}

export function AssetHeader({ asset }: { asset: AssetDetail }) {
  return (
    <div className="space-y-2">
      <div>
        <h1 className="text-xl font-semibold">{asset.name}</h1>
        <p className="text-xs text-muted-foreground">{asset.symbol}</p>
      </div>
      <p className="text-3xl font-bold tabular-nums">{formatPrice(asset.price)}</p>
      <p
        className={`text-sm tabular-nums ${
          asset.change24h >= 0 ? 'text-emerald-600' : 'text-destructive'
        }`}
      >
        {asset.change24h >= 0 ? '+' : ''}
        {asset.change24h.toFixed(2)}% (24h)
      </p>
      <dl className="grid grid-cols-3 gap-2 pt-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Market cap</dt>
          <dd className="font-medium tabular-nums">{formatPrice(asset.marketCap)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">24h high</dt>
          <dd className="font-medium tabular-nums">{formatPrice(asset.high24h)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">24h low</dt>
          <dd className="font-medium tabular-nums">{formatPrice(asset.low24h)}</dd>
        </div>
      </dl>
    </div>
  );
}
