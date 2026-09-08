import { formatMoney } from '@/lib/format/money';

export interface WalletSummary {
  id: string;
  currency: string;
  balance: number;
}

export function WalletList({ wallets }: { wallets: WalletSummary[] }) {
  return (
    <ul className="divide-y divide-border">
      {wallets.map((w) => (
        <li key={w.id} className="flex items-center justify-between py-3">
          <span className="text-sm font-medium">{w.currency}</span>
          <span className="text-sm font-semibold tabular-nums">{formatMoney(w.balance, w.currency)}</span>
        </li>
      ))}
    </ul>
  );
}
