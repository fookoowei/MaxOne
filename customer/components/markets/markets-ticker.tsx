import Link from 'next/link';
import { formatPrice } from '@/lib/format/price';
import { cn } from '@/lib/utils';
import type { WatchedAsset } from '@/components/wallet/watching-card';

// Desktop aside: the top few assets, server-rendered from the 15s-cached list. Hidden entirely
// when the catalog is empty (provider throttled) — an empty shell labelled "live · 15s" is worse
// than nothing.
export function MarketsTicker({ assets }: { assets: (WatchedAsset & { name: string })[] }) {
  if (assets.length === 0) return null;
  return (
    <section className="rounded-[20px] border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Markets</h2>
        <span className="text-xs text-muted-foreground">live · 15s</span>
      </div>
      <ul className="mt-1 divide-y">
        {assets.slice(0, 4).map((a) => (
          <li key={a.symbol}>
            <Link href={`/markets/${a.id}`} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{a.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{a.symbol}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular">{formatPrice(a.price)}</p>
                <p className={cn('mt-0.5 text-xs tabular', a.change24h >= 0 ? 'text-status-approved' : 'text-destructive')}>
                  {a.change24h >= 0 ? '+' : ''}
                  {a.change24h.toFixed(2)}%
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
