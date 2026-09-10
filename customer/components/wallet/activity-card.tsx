import { ArrowDownToLine, ArrowUpDown, ArrowUpFromLine, History, Send } from 'lucide-react';
import { CardLink } from '@/components/layout/card-link';
import { MoneyText } from '@/components/money-text';
import { EmptyState } from '@/components/layout/empty-state';
import { RelativeTime } from '@/components/layout/relative-time';
import { cn } from '@/lib/utils';

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  note: string | null;
  createdAt: string;
}

const ICON: Record<string, typeof Send> = { deposit: ArrowDownToLine, withdrawal: ArrowUpFromLine, transfer_out: Send, transfer_in: ArrowDownToLine, adjustment: ArrowUpDown };
const CREDITS = new Set(['deposit', 'transfer_in']);
const LABEL: Record<string, string> = { deposit: 'Deposit', withdrawal: 'Withdrawal', transfer_out: 'Sent', transfer_in: 'Received', adjustment: 'Adjustment' };

export function isCredit(type: string): boolean {
  return CREDITS.has(type);
}

// A statement, not a log: what it was, whether it's settled, and the amount signed by direction.
// Colour appears only on money that arrived; pending is a pill, never a colour on the amount.
export function ActivityCard({
  transactions,
  currency,
  limit,
  seeAllHref,
  title = 'Recent activity',
  empty = { title: 'No activity yet', description: 'Add money to get started.' },
}: {
  transactions: Transaction[];
  currency: string;
  limit?: number;
  seeAllHref?: string;
  title?: string;
  /** What to say when there are no rows — a filtered card (e.g. transfers only) needs its own hint. */
  empty?: { title: string; description?: string };
}) {
  const rows = limit ? transactions.slice(0, limit) : transactions;
  return (
    <section className="rounded-[20px] border bg-card px-4 pb-1 pt-1">
      <div className="flex items-center justify-between py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {seeAllHref && transactions.length > (limit ?? 0) && (
          <CardLink href={seeAllHref}>See all</CardLink>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="pb-3">
          <EmptyState icon={History} title={empty.title} description={empty.description} />
        </div>
      ) : (
        <ul className="divide-y">
          {rows.map((t) => {
            const Icon = ICON[t.type] ?? ArrowUpDown;
            const credit = isCredit(t.type);
            const pending = t.status === 'pending';
            const rejected = t.status === 'rejected';
            return (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{LABEL[t.type] ?? t.type}{t.note ? ` · ${t.note}` : ''}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {pending ? (
                        <span className="inline-flex h-5 items-center rounded-full bg-status-pending/12 px-2 text-xs font-medium text-status-pending">Pending review</span>
                      ) : rejected ? (
                        <span className="inline-flex h-5 items-center rounded-full bg-status-rejected/12 px-2 text-xs font-medium text-status-rejected">Declined</span>
                      ) : (
                        <RelativeTime iso={t.createdAt} />
                      )}
                    </p>
                  </div>
                </div>
                <MoneyText amountMinor={t.amount} currency={currency} tone={pending || rejected ? 'neutral' : credit ? 'positive' : 'negative'} className={cn('shrink-0 font-semibold', (pending || rejected) && 'text-muted-foreground')} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
