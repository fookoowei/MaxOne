import Link from 'next/link';
import { formatPrice } from '@/lib/format/price';
import { ChangeText } from '@/components/markets/change-text';
import { WatchButton } from '@/components/markets/watch-button';
import { CoinIcon } from '@/components/markets/coin-icon';

export interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
  type: 'crypto' | 'stock';
  price: number;
  change24h: number;
  image?: string; // provider logo; absent → CoinIcon falls back to the lettered badge
}

// One row per asset: ticker avatar, name, price + 24h (colour = direction, always with a sign),
// and the watch star. The row is a link; the star is its own 44px target beside it.
export function MarketList({ assets, followedSymbols, emptyText = 'Markets are unavailable right now.' }: { assets: MarketAsset[]; followedSymbols?: string[]; emptyText?: string }) {
  if (assets.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }
  return (
    <ul className="divide-y">
      {assets.map((a) => (
        <li key={`${a.type}:${a.symbol}`} className="flex items-center gap-3 py-3">
          <Link href={`/markets/${a.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-3">
              <CoinIcon src={a.image} symbol={a.symbol} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{a.name}</span>
                <span className="block text-xs text-muted-foreground">{a.symbol}</span>
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-sm font-semibold tabular">{formatPrice(a.price)}</span>
              <ChangeText pct={a.change24h} className="block text-xs tabular" />
            </span>
          </Link>
          {followedSymbols && <WatchButton symbol={a.symbol} type={a.type} followed={followedSymbols.includes(a.symbol)} />}
        </li>
      ))}
    </ul>
  );
}
