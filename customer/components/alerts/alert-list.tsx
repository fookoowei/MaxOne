import Link from 'next/link';
import { BellPlus, BellRing } from 'lucide-react';
import { formatPrice } from '@/lib/format/price';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/layout/empty-state';
import { RemoveAlertButton } from '@/components/alerts/remove-alert-button';
import { CoinIcon } from '@/components/markets/coin-icon';
import type { AlertRow } from '@/lib/alerts/compute';

export function AlertList({ rows }: { rows: AlertRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={BellRing}
        title="No alerts yet"
        description="Pick an asset and a price, and we'll watch it for you."
        action={
          <Link href="/alerts/new" className={buttonVariants({ size: 'xl' })}>
            <BellPlus data-icon="inline-start" aria-hidden />
            Set an alert
          </Link>
        }
      />
    );
  }
  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <CoinIcon src={r.image} symbol={r.symbol} className="size-8 text-[10px]" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{r.symbol}</p>
              <p className="text-xs text-muted-foreground">
                {r.direction === 'above' ? 'Above' : 'Below'} {formatPrice(r.targetPrice)}
                {r.currentPrice !== null && <> · now {formatPrice(r.currentPrice)}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-medium ${r.triggeredAt ? 'bg-status-approved/12 text-status-approved' : 'bg-muted text-muted-foreground'}`}>
              {r.triggeredAt ? 'Reached' : 'Watching'}
            </span>
            <RemoveAlertButton id={r.id} symbol={r.symbol} />
          </div>
        </li>
      ))}
    </ul>
  );
}
