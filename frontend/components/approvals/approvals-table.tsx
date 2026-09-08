'use client';

import { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, ClipboardCheck } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoneyText } from '@/components/money-text';
import { EmptyState } from '@/components/empty-state';
import { RelativeTime } from '@/components/relative-time';
import { cn } from '@/lib/utils';
import { RowActions } from './row-actions';

export interface PendingTransaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  note: string | null;
  createdAt: string;
  wallet: { id: string; name: string; currency: string; user: { email: string } };
}

type Kind = 'all' | 'deposit' | 'withdrawal';
type Sort = 'oldest' | 'newest' | 'largest';

// The work queue. Small by nature (it's what hasn't been decided yet), so it filters and sorts in
// the browser; the decision itself is a dialog + one API call per row.
export function ApprovalsTable({ rows, role }: { rows: PendingTransaction[]; role: string }) {
  const [kind, setKind] = useState<Kind>('all');
  const [sort, setSort] = useState<Sort>('oldest');
  const counts = { all: rows.length, deposit: rows.filter((r) => r.type === 'deposit').length, withdrawal: rows.filter((r) => r.type === 'withdrawal').length };
  const visible = useMemo(() => {
    const f = rows.filter((r) => kind === 'all' || r.type === kind);
    return f.sort((a, b) => (sort === 'largest' ? b.amount - a.amount : sort === 'newest' ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt)));
  }, [rows, kind, sort]);

  if (rows.length === 0) {
    return <EmptyState icon={ClipboardCheck} title="Nothing waiting" description="Every request has been decided. New deposits and withdrawals will appear here." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1" role="group" aria-label="Filter by type">
          {(['all', 'deposit', 'withdrawal'] as Kind[]).map((k) => (
            <Button key={k} size="sm" variant={kind === k ? 'secondary' : 'ghost'} aria-pressed={kind === k} onClick={() => setKind(k)} className="capitalize">
              {k === 'all' ? 'All' : `${k}s`}
              <span className="tabular text-muted-foreground">{counts[k]}</span>
            </Button>
          ))}
        </div>
        <div className="flex gap-1" role="group" aria-label="Sort">
          {(['oldest', 'newest', 'largest'] as Sort[]).map((s) => (
            <Button key={s} size="sm" variant={sort === s ? 'secondary' : 'ghost'} aria-pressed={sort === s} onClick={() => setSort(s)} className="capitalize">
              {s} first
            </Button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Request</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Waiting</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => {
              const Icon = row.type === 'deposit' ? ArrowDownToLine : ArrowUpFromLine;
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <span className={cn('flex size-7 items-center justify-center rounded-md', row.type === 'deposit' ? 'bg-status-approved/12 text-status-approved' : 'bg-status-pending/12 text-status-pending')}>
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="font-medium capitalize">{row.type}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyText amountMinor={row.amount} currency={row.wallet.currency} className="font-medium" />
                  </TableCell>
                  <TableCell>
                    <span className="grid leading-tight">
                      <span>{row.wallet.user.email}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.wallet.name} <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">{row.wallet.currency}</Badge>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="max-w-56 truncate text-muted-foreground">{row.note ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <RelativeTime iso={row.createdAt} />
                  </TableCell>
                  <TableCell>
                    <RowActions id={row.id} role={role} subject={{ type: row.type, amount: row.amount, currency: row.wallet.currency, walletName: row.wallet.name, ownerEmail: row.wallet.user.email }} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
