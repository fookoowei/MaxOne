import Link from 'next/link';
import { PieChart, Plus } from 'lucide-react';
import { formatPrice } from '@/lib/format/price';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/layout/empty-state';
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
          <Link href={`/markets/${r.id}`} className="flex-1">
            <p className="text-sm font-medium">{r.name}</p>
            <p className="text-xs text-muted-foreground">
              {r.quantity} {r.symbol}
            </p>
          </Link>
          <div className="mr-2 text-right">
            <p className="text-sm font-semibold tabular-nums">{formatPrice(r.value)}</p>
            <p
              className={`text-xs tabular-nums ${r.pnl >= 0 ? 'text-emerald-600' : 'text-destructive'}`}
            >
              {r.pnl >= 0 ? '+' : ''}
              {r.pnlPct.toFixed(2)}%
            </p>
          </div>
          <RemoveHoldingButton symbol={r.symbol} />
        </li>
      ))}
    </ul>
  );
}
