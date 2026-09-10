import Link from 'next/link';
import { formatPrice } from '@/lib/format/price';
import { CardLink } from '@/components/layout/card-link';
import { cn } from '@/lib/utils';

export interface WatchedAsset {
  id: string;
  symbol: string;
  price: number;
  change24h: number;
}

// Up to three watched assets as tiles. Hidden entirely when nothing is watched — an empty card
// would be filler.
export function WatchingCard({ assets }: { assets: WatchedAsset[] }) {
  if (assets.length === 0) return null;
  return (
    <section className="rounded-[20px] border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Watching</h2>
        <CardLink href="/markets">Markets</CardLink>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {assets.slice(0, 3).map((a) => (
          <Link key={a.symbol} href={`/markets/${a.id}`} className="rounded-2xl border p-3 hover:bg-accent/40">
            <p className="text-xs text-muted-foreground">{a.symbol}</p>
            <p className="mt-1 text-sm font-semibold tabular">{formatPrice(a.price)}</p>
            <p className={cn('mt-0.5 text-xs tabular', a.change24h >= 0 ? 'text-status-approved' : 'text-destructive')}>
              {a.change24h >= 0 ? '+' : ''}
              {a.change24h.toFixed(1)}%
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
