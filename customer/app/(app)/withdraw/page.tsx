import { redirect } from 'next/navigation';
import Link from 'next/link';
import { serverApi } from '@/lib/api/server';
import { AmountForm } from '@/components/amount-form';

interface Wallet {
  id: string;
  currency: string;
  balance: number;
}

export default async function WithdrawPage() {
  const res = await serverApi('/wallets');
  if (res.status === 401) redirect('/login');
  const wallets = (await res.json()) as Wallet[];
  const primary = wallets[0];
  if (!primary) redirect('/');

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/" className="text-sm text-muted-foreground">
          ← Back
        </Link>
        <h1 className="text-xl font-semibold">Withdraw</h1>
        <p className="text-sm text-muted-foreground">Request a withdrawal from your wallet.</p>
      </header>
      <AmountForm mode="withdraw" walletId={primary.id} currency={primary.currency} />
    </div>
  );
}
