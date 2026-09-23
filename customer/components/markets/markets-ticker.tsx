import Link from 'next/link';
import { formatChangePct, formatPrice } from '@/lib/format/price';
import { CoinIcon } from '@/components/markets/coin-icon';
import { cn } from '@/lib/utils';
import type { WatchedAsset } from '@/components/wallet/watching-card';

// Desktop aside: the top few assets, server-rendered from the 15s-cached list. Hidden entirely
// when the catalog is empty (provider throttled) — an empty shell labelled "live · 15s" is worse
// than nothing.
export function MarketsTicker({ assets }: { assets: (WatchedAsset & { name: string })[] }) {
  if (assets.length === 0) return null;
  return (
    <section className="rounded-[20px] border bg-card px-4 pb-1 pt-1">
      <div className="flex items-center justify-between py-3">
        <h2 className="text-sm font-semibold">Markets</h2>
        <span className="text-xs text-muted-foreground">live · 15s</span>
      </div>
      <ul className="divide-y">
        {assets.slice(0, 4).map((a) => (
          <li key={a.symbol}>
            <Link href={`/markets/${a.id}`} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <CoinIcon src={a.image} symbol={a.symbol} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.symbol}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular">{formatPrice(a.price)}</p>
                <p className={cn('text-xs tabular', a.change24h >= 0 ? 'text-status-approved' : 'text-status-rejected')}>{formatChangePct(a.change24h)}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
