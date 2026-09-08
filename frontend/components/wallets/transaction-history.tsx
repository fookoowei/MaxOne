import { History } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoneyText } from '@/components/money-text';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState } from '@/components/empty-state';
import { RelativeTime } from '@/components/relative-time';

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  note: string | null;
  createdAt: string;
  balanceAfter: number | null;
}

const CREDITS = new Set(['deposit', 'transfer_in']);
const DEBITS = new Set(['withdrawal', 'transfer_out']);

// A ledger, read like a statement: the amount is signed by direction (colour = direction, nothing
// else), the running balance sits beside it, and pending rows show no running balance yet.
export function TransactionHistory({ rows, currency }: { rows: WalletTransaction[]; currency: string }) {
  if (rows.length === 0) {
    return <EmptyState icon={History} title="No transactions yet" description="Deposits, withdrawals, transfers and adjustments will appear here." />;
  }
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Balance after</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => {
            const tone = t.status !== 'approved' ? 'neutral' : CREDITS.has(t.type) ? 'positive' : DEBITS.has(t.type) ? 'negative' : 'neutral';
            return (
              <TableRow key={t.id}>
                <TableCell className="capitalize">{t.type.replace('_', ' ')}</TableCell>
                <TableCell className="text-right"><MoneyText amountMinor={t.amount} currency={currency} tone={tone} /></TableCell>
                <TableCell><StatusBadge status={t.status} /></TableCell>
                <TableCell className="text-right">{t.balanceAfter === null ? <span className="text-muted-foreground">—</span> : <MoneyText amountMinor={t.balanceAfter} currency={currency} />}</TableCell>
                <TableCell className="max-w-48 truncate text-muted-foreground">{t.note ?? '—'}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground"><RelativeTime iso={t.createdAt} /></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
