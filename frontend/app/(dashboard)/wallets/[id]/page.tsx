import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { roleHasPermission } from '@/lib/auth/permissions';
import { serverApi } from '@/lib/api/server';
import { formatMoney } from '@/lib/format/money';
import type { StaffWallet } from '@/components/wallets/wallets-table';
import { TransactionHistory, type WalletTransaction } from '@/components/wallets/transaction-history';

export default async function WalletDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect('/login');

  if (!roleHasPermission(user.role, 'transaction.view_all')) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Wallet</h1>
        <p className="mt-2 text-sm text-muted-foreground">You don&apos;t have access to wallets.</p>
      </div>
    );
  }

  const [wRes, tRes] = await Promise.all([
    serverApi(`/admin/wallets/${id}`),
    serverApi(`/admin/wallets/${id}/transactions`),
  ]);
  if (wRes.status === 401 || tRes.status === 401) redirect('/login');
  if (wRes.status === 404) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Wallet</h1>
        <p className="mt-2 text-sm text-muted-foreground">Wallet not found.</p>
      </div>
    );
  }
  if (!wRes.ok || !tRes.ok) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Wallet</h1>
        <p className="mt-2 text-sm text-red-600">Couldn&apos;t load this wallet. Try again.</p>
      </div>
    );
  }

  const wallet = (await wRes.json()) as StaffWallet;
  const txns = (await tRes.json()) as WalletTransaction[];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">{wallet.name}</h1>
        <p className="text-2xl font-semibold tabular-nums">{formatMoney(wallet.balance, wallet.currency)}</p>
        <p className="text-sm text-muted-foreground">
          {wallet.currency} · owner {wallet.user.email}
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Transaction history</h2>
        <TransactionHistory rows={txns} currency={wallet.currency} />
      </section>
    </div>
  );
}
