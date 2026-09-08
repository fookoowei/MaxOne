import { MoneyText } from '@/components/money-text';
import { RelativeTime } from '@/components/layout/relative-time';
import type { Transaction } from './activity-card';

// Desktop aside: what's waiting on a reviewer, with how long it has waited.
export function PendingCard({ transactions, currency }: { transactions: Transaction[]; currency: string }) {
  const pending = transactions.filter((t) => t.status === 'pending');
  return (
    <section className="rounded-[20px] border bg-card p-4">
      <h2 className="text-sm font-semibold">Pending</h2>
      {pending.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nothing waiting for review.</p>
      ) : (
        <ul className="mt-1 divide-y">
          {pending.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium capitalize">
                  {t.type} <MoneyText amountMinor={t.amount} currency={currency} />
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Waiting for review · <RelativeTime iso={t.createdAt} />
                </p>
              </div>
              <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-status-pending/12 px-2 text-xs font-medium text-status-pending">Pending</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
