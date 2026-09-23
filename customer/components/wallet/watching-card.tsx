import Link from 'next/link';
import { formatPrice } from '@/lib/format/price';
import { ChangeText } from '@/components/markets/change-text';
import { Panel } from '@/components/layout/panel';
import { CardLink } from '@/components/layout/card-link';
import { CoinIcon } from '@/components/markets/coin-icon';

export interface WatchedAsset {
  id: string;
  symbol: string;
  name?: string;
  price: number;
  change24h: number;
  image?: string;
}

// Watched assets as rows — the same row the markets list uses, so one coin never sits alone in a
// grid. Hidden entirely when nothing is watched: an empty card would be filler.
export function WatchingCard({ assets }: { assets: WatchedAsset[] }) {
  if (assets.length === 0) return null;
  return (
    <Panel title="Watching" action={<CardLink href="/markets">Markets</CardLink>}>
      <ul className="divide-y">
        {assets.slice(0, 4).map((a) => (
          <li key={a.symbol}>
            <Link href={`/markets/${a.id}`} className="flex items-center gap-3 py-3">
              <CoinIcon src={a.image} symbol={a.symbol} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{a.name ?? a.symbol}</span>
                <span className="block text-xs text-muted-foreground">{a.name ? a.symbol : '24h'}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold tabular">{formatPrice(a.price)}</span>
                <ChangeText pct={a.change24h} className="block text-xs tabular" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
