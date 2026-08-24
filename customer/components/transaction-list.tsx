import { formatMoney } from '@/lib/format/money';

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  note: string | null;
  createdAt: string;
}

// Deposits credit the wallet (+), withdrawals/transfers-out debit it (-).
function signedAmount(type: string, amount: number, currency: string): string {
  const isCredit = type === 'deposit';
  const formatted = formatMoney(amount, currency);
  return `${isCredit ? '+' : '-'}${formatted}`;
}

export function TransactionList({
  transactions,
  currency,
}: {
  transactions: Transaction[];
  currency: string;
}) {
  if (transactions.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No transactions yet</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {transactions.map((t) => (
        <li key={t.id} className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium capitalize">{t.type}</p>
            <p className="text-xs text-muted-foreground">{t.note ?? t.status}</p>
          </div>
          <span
            className={`text-sm font-semibold tabular-nums ${
              t.type === 'deposit' ? 'text-emerald-600' : 'text-foreground'
            }`}
          >
            {signedAmount(t.type, t.amount, currency)}
          </span>
        </li>
      ))}
    </ul>
  );
}
