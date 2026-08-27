import Link from 'next/link';
import { formatPrice } from '@/lib/format/price';
import { RemoveHoldingButton } from '@/components/remove-holding-button';
import type { HoldingRow } from '@/lib/portfolio/compute';

export function HoldingList({ rows }: { rows: HoldingRow[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Add your first holding.</p>;
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
