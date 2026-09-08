'use client';

import Link from 'next/link';
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MoneyText } from '@/components/money-text';
import { EmptyState } from '@/components/empty-state';
import { RelativeTime } from '@/components/relative-time';
import { RowActions } from '@/components/approvals/row-actions';
import type { PendingTransaction } from '@/components/approvals/approvals-table';
import { cn } from '@/lib/utils';

// The five oldest requests, decidable right here. Same dialogs as the queue.
export function NeedsDecision({ rows, total, role }: { rows: PendingTransaction[]; total: number; role: string }) {
  return (
    <section className="rounded-lg border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Needs a decision</h2>
        {total > 0 && (
          <Button variant="ghost" size="sm" render={<Link href="/approvals" />}>
            View all {total}
            <ArrowRight aria-hidden />
          </Button>
        )}
      </header>
      {rows.length === 0 ? (
        <div className="p-4">
          <EmptyState icon={ClipboardCheck} title="Nothing waiting" description="Every request has been decided." />
        </div>
      ) : (
        <ul className="divide-y">
          {rows.map((r) => {
            const Icon = r.type === 'deposit' ? ArrowDownToLine : ArrowUpFromLine;
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', r.type === 'deposit' ? 'bg-status-approved/12 text-status-approved' : 'bg-status-pending/12 text-status-pending')}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="grid min-w-0 flex-1 basis-48 leading-tight">
                  <span className="sm:truncate">
                    <span className="font-medium capitalize">{r.type}</span> <MoneyText amountMinor={r.amount} currency={r.wallet.currency} className="font-medium" />
                    <span className="text-muted-foreground"> · {r.wallet.user.email}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {r.wallet.name} · <RelativeTime iso={r.createdAt} />{r.note ? ` · ${r.note}` : ''}
                  </span>
                </span>
                <RowActions id={r.id} role={role} size="xs" subject={{ type: r.type, amount: r.amount, currency: r.wallet.currency, walletName: r.wallet.name, ownerEmail: r.wallet.user.email }} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
