import { currencyFlag, currencyName } from '@/lib/currencies';
import { formatMoney } from '@/lib/format/money';

export interface WalletSummary {
  id: string;
  currency: string;
  balance: number;
}

// Each currency wallet as a row like the reference's asset list: flag, code over name, balance.
export function WalletList({ wallets }: { wallets: WalletSummary[] }) {
  return (
    <ul className="divide-y divide-border">
      {wallets.map((w) => (
        <li key={w.id} className="flex items-center gap-3 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-lg leading-none" aria-hidden>
            {currencyFlag(w.currency)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{w.currency}</span>
            <span className="block text-xs text-muted-foreground">{currencyName(w.currency)}</span>
          </span>
          <span className="text-sm font-semibold tabular">{formatMoney(w.balance, w.currency)}</span>
        </li>
      ))}
    </ul>
  );
}
