import Link from 'next/link';
import { formatMoney } from '@/lib/format/money';

export interface StaffWallet {
  id: string;
  name: string;
  currency: string;
  balance: number;
  createdAt: string;
  user: { email: string };
}

export function WalletsTable({ wallets }: { wallets: StaffWallet[] }) {
  if (wallets.length === 0) {
    return <p className="text-sm text-muted-foreground">No wallets.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-2 font-medium">Wallet</th>
            <th className="px-4 py-2 font-medium">Owner</th>
            <th className="px-4 py-2 font-medium">Currency</th>
            <th className="px-4 py-2 font-medium">Balance</th>
          </tr>
        </thead>
        <tbody>
          {wallets.map((w) => (
            <tr key={w.id} className="border-b last:border-0">
              <td className="px-4 py-2">
                <Link href={`/wallets/${w.id}`} className="font-medium text-blue-600 hover:underline">
                  {w.name}
                </Link>
              </td>
              <td className="px-4 py-2">{w.user.email}</td>
              <td className="px-4 py-2">{w.currency}</td>
              <td className="px-4 py-2 tabular-nums">{formatMoney(w.balance, w.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
