import { formatMoney } from '@/lib/format/money';

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  note: string | null;
  createdAt: string;
  balanceAfter: number | null;
}

export function TransactionHistory({ rows, currency }: { rows: WalletTransaction[]; currency: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No transactions yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-2 font-medium">Type</th>
            <th className="px-4 py-2 font-medium">Amount</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Balance after</th>
            <th className="px-4 py-2 font-medium">When</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-b last:border-0">
              <td className="px-4 py-2 capitalize">{t.type}</td>
              <td className="px-4 py-2 tabular-nums">{formatMoney(t.amount, currency)}</td>
              <td className="px-4 py-2 capitalize">{t.status}</td>
              <td className="px-4 py-2 tabular-nums">
                {t.balanceAfter === null ? '—' : formatMoney(t.balanceAfter, currency)}
              </td>
              <td className="px-4 py-2 text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
