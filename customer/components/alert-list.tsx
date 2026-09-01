import { formatPrice } from '@/lib/format/price';
import { RemoveAlertButton } from '@/components/remove-alert-button';
import type { AlertRow } from '@/lib/alerts/compute';

export function AlertList({ rows }: { rows: AlertRow[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Set your first alert.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium">{r.symbol}</p>
            <p className="text-xs text-muted-foreground">
              {r.direction === 'above' ? 'Above' : 'Below'} {formatPrice(r.targetPrice)}
              {r.currentPrice !== null && <> · now {formatPrice(r.currentPrice)}</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                r.triggeredAt ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
              }`}
            >
              {r.triggeredAt ? '🔔 Reached' : 'Pending'}
            </span>
            <RemoveAlertButton id={r.id} />
          </div>
        </li>
      ))}
    </ul>
  );
}
