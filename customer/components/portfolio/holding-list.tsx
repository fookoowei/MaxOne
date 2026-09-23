import Link from 'next/link';
import { PieChart, Plus } from 'lucide-react';
import { formatPrice } from '@/lib/format/price';
import { ChangeText } from '@/components/markets/change-text';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/layout/empty-state';
import { CoinIcon } from '@/components/markets/coin-icon';
import { RemoveHoldingButton } from '@/components/portfolio/remove-holding-button';
import type { HoldingRow } from '@/lib/portfolio/compute';

export function HoldingList({ rows }: { rows: HoldingRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={PieChart}
        title="Nothing tracked yet"
        description="Add what you hold elsewhere to see its value and P/L here."
        action={
          <Link href="/portfolio/new" className={buttonVariants({ size: 'xl' })}>
            <Plus data-icon="inline-start" aria-hidden />
            Add a holding
          </Link>
        }
      />
    );
  }
  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={r.symbol} className="flex items-center justify-between py-3">
          <Link href={`/markets/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
            <CoinIcon src={r.image} symbol={r.symbol} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{r.name}</span>
              <span className="block text-xs text-muted-foreground">
                {r.quantity} {r.symbol}
              </span>
            </span>
          </Link>
          <div className="mr-2 text-right">
            <p className="text-sm font-semibold tabular">{formatPrice(r.value)}</p>
            <ChangeText pct={r.pnlPct} className="block text-xs tabular" />
          </div>
          <RemoveHoldingButton symbol={r.symbol} />
        </li>
      ))}
    </ul>
  );
}
