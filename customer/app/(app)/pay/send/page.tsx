import { redirect } from 'next/navigation';
import Link from 'next/link';
import { serverApi } from '@/lib/api/server';
import { TransferForm } from '@/components/transfer-form';

interface Wallet {
  id: string;
  currency: string;
}

export default async function SendPage({
  searchParams,
}: {
  searchParams: Promise<{ handle?: string }>;
}) {
  const { handle } = await searchParams;
  const res = await serverApi('/wallets');
  if (res.status === 401) redirect('/login');
  const wallets = (await res.json()) as Wallet[];
  const primary = wallets[0];
  if (!primary) redirect('/');

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/pay" className="text-sm text-muted-foreground">
          ← Back
        </Link>
        <h1 className="text-xl font-semibold">Send money</h1>
      </header>
      <TransferForm myWalletId={primary.id} myCurrency={primary.currency} prefillHandle={handle ?? ''} />
    </div>
  );
}
