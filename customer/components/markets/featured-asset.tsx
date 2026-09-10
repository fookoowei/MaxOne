import Link from 'next/link';
import { Bell } from 'lucide-react';
import { formatPrice } from '@/lib/format/price';
import { PriceChart } from '@/components/markets/price-chart';
import { buttonVariants } from '@/components/ui/button';
import { CardLink } from '@/components/layout/card-link';
import { CoinIcon } from '@/components/markets/coin-icon';
import { cn } from '@/lib/utils';
import type { MarketAsset } from '@/components/markets/market-list';

// Desktop aside on Markets: one asset in depth — the first watched one, else the top of the list.
export function FeaturedAsset({ asset, chart }: { asset: MarketAsset; chart: { points: number[]; labels: string[] } }) {
  return (
    <section className="space-y-3 rounded-[20px] border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <CoinIcon src={asset.image} symbol={asset.symbol} className="size-8 text-[10px]" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{asset.name}</p>
            <p className="text-xs text-muted-foreground">{asset.symbol} · 7 days</p>
          </div>
        </div>
        <CardLink href={`/markets/${asset.id}`}>Details</CardLink>
      </div>
      <p className="text-[28px] leading-9 font-bold tracking-tight tabular">
        {formatPrice(asset.price)}{' '}
        <span className={cn('text-sm font-semibold', asset.change24h >= 0 ? 'text-status-approved' : 'text-destructive')}>
          {asset.change24h >= 0 ? '+' : ''}
          {asset.change24h.toFixed(2)}%
        </span>
      </p>
      <PriceChart id={asset.id} initial={chart} />
      <Link href={`/alerts/new?symbol=${encodeURIComponent(asset.symbol)}`} className={buttonVariants({ variant: 'outline', className: 'h-10 w-full' })}>
        <Bell data-icon="inline-start" aria-hidden />
        Set a price alert
      </Link>
    </section>
  );
}
