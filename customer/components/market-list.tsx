import Link from 'next/link';
import { formatPrice } from '@/lib/format/price';
import { WatchButton } from '@/components/watch-button';

export interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
  type: 'crypto' | 'stock';
  price: number;
  change24h: number;
}

export function MarketList({
  assets,
  followedSymbols,
}: {
  assets: MarketAsset[];
  followedSymbols?: string[];
}) {
  if (assets.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Markets are unavailable right now.</p>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {assets.map((a) => (
        <li key={`${a.type}:${a.symbol}`} className="flex items-center justify-between py-3">
          <Link href={`/markets/${a.id}`} className="flex flex-1 items-center justify-between gap-2">
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
          </Link>
          {followedSymbols && (
            <WatchButton
              symbol={a.symbol}
              type={a.type}
              followed={followedSymbols.includes(a.symbol)}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
