import { formatMoney } from '@/lib/format/money';
import { RowActions } from './row-actions';

export interface PendingTransaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  note: string | null;
  createdAt: string;
  wallet: { id: string; name: string; currency: string; user: { email: string } };
}

export function ApprovalsTable({ rows, role }: { rows: PendingTransaction[]; role: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No pending transactions.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-2 font-medium">Type</th>
            <th className="px-4 py-2 font-medium">Amount</th>
            <th className="px-4 py-2 font-medium">Wallet</th>
            <th className="px-4 py-2 font-medium">Owner</th>
            <th className="px-4 py-2 font-medium">Requested</th>
            <th className="px-4 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0">
              <td className="px-4 py-2 capitalize">{row.type}</td>
              <td className="px-4 py-2 tabular-nums">{formatMoney(row.amount, row.wallet.currency)}</td>
              <td className="px-4 py-2">{row.wallet.name}</td>
              <td className="px-4 py-2">{row.wallet.user.email}</td>
              <td className="px-4 py-2 text-muted-foreground">
                {new Date(row.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-2">
                <RowActions id={row.id} type={row.type} role={role} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
