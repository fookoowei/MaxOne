import { redirect } from 'next/navigation';
import Link from 'next/link';
import { serverApi } from '@/lib/api/server';
import { AmountForm } from '@/components/amount-form';

interface Wallet {
  id: string;
  currency: string;
  balance: number;
}

export default async function DepositPage() {
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
        <h1 className="text-xl font-semibold">Add money</h1>
        <p className="text-sm text-muted-foreground">Request a deposit into your wallet.</p>
      </header>
      <AmountForm mode="deposit" walletId={primary.id} currency={primary.currency} />
    </div>
  );
}
