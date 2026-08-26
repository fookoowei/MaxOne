import { redirect } from 'next/navigation';
import Link from 'next/link';
import { serverApi } from '@/lib/api/server';
import { AddWalletForm } from '@/components/add-wallet-form';

interface Wallet {
  currency: string;
}

export default async function NewWalletPage() {
  const res = await serverApi('/wallets');
  if (res.status === 401) redirect('/login');
  const wallets = (await res.json()) as Wallet[];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/" className="text-sm text-muted-foreground">
          ← Back
        </Link>
        <h1 className="text-xl font-semibold">Add a currency</h1>
      </header>
      <AddWalletForm held={wallets.map((w) => w.currency)} />
    </div>
  );
}
