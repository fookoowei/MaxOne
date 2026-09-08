import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { roleHasPermission } from '@/lib/auth/permissions';
import { serverApi } from '@/lib/api/server';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MoneyText } from '@/components/money-text';
import { PageHeader } from '@/components/page-header';
import type { StaffWallet } from '@/components/wallets/wallets-table';
import { TransactionHistory, type WalletTransaction } from '@/components/wallets/transaction-history';
import { AdjustmentForm } from '@/components/wallets/adjustment-form';

export default async function WalletDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!roleHasPermission(user.role, 'transaction.view_all')) {
    return <PageHeader title="Wallet" description="You don't have access to wallets." />;
  }

  const [wRes, tRes] = await Promise.all([serverApi(`/admin/wallets/${id}`), serverApi(`/admin/wallets/${id}/transactions`)]);
  if (wRes.status === 401 || tRes.status === 401) redirect('/login');
  if (wRes.status === 404) return <PageHeader title="Wallet" description="No wallet with that id." />;
  if (!wRes.ok || !tRes.ok) return <PageHeader title="Wallet" description="Couldn't load this wallet. Try again." />;

  const wallet = (await wRes.json()) as StaffWallet;
  const txns = (await tRes.json()) as WalletTransaction[];
  const canAdjust = roleHasPermission(user.role, 'wallet.adjust');
  const pendingCount = txns.filter((t) => t.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{wallet.name}</h1>
            <Badge variant="outline">{wallet.currency}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {wallet.user.email} · opened {new Date(wallet.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Available balance</p>
          <MoneyText amountMinor={wallet.balance} currency={wallet.currency} className="text-3xl font-semibold tracking-tight" />
          {pendingCount > 0 && <p className="text-xs text-status-pending">{pendingCount} pending request{pendingCount === 1 ? '' : 's'}</p>}
        </div>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          {canAdjust && <TabsTrigger value="adjust">Adjust balance</TabsTrigger>}
        </TabsList>
        <TabsContent value="transactions" className="pt-4">
          <TransactionHistory rows={txns} currency={wallet.currency} />
        </TabsContent>
        {canAdjust && (
          <TabsContent value="adjust" className="pt-4">
            <div className="max-w-md space-y-2 rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">A manual credit or debit, recorded in the audit trail with your note. Use it for corrections, not for deposits.</p>
              <AdjustmentForm walletId={wallet.id} role={user.role} />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
