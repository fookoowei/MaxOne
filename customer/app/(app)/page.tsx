import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/api/server';
import { getSessionUser } from '@/lib/auth/session';
import { BalanceCard } from '@/components/balance-card';
import { WalletActions } from '@/components/wallet-actions';
import { TransactionList, type Transaction } from '@/components/transaction-list';

interface Wallet {
  id: string;
  name: string;
  currency: string;
  balance: number;
}

// Reads run in a Server Component: the proxy has already refreshed an expired access
// token before render, so a 401 here is terminal → send the user to log in.
export default async function DashboardPage() {
  const session = await getSessionUser();
  const walletsRes = await serverApi('/wallets');
  if (walletsRes.status === 401) redirect('/login');

  const wallets = (await walletsRes.json()) as Wallet[];
  const primary = wallets[0]; // foundation: exactly one auto-created USD wallet

  let transactions: Transaction[] = [];
  if (primary) {
    const txRes = await serverApi(`/wallets/${primary.id}/transactions`);
    if (txRes.ok) transactions = (await txRes.json()) as Transaction[];
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="text-lg font-semibold">{session?.email ?? 'Your wallet'}</h1>
      </header>

      {primary ? (
        <BalanceCard balance={primary.balance} currency={primary.currency} />
      ) : (
        <p className="text-sm text-muted-foreground">No wallet found for your account.</p>
      )}

      <WalletActions />

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Recent activity</h2>
        <TransactionList transactions={transactions} currency={primary?.currency ?? 'USD'} />
      </section>
    </div>
  );
}
