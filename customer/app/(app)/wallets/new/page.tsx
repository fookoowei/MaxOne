import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/api/server';
import { PageHeader } from '@/components/layout/page-header';
import { AddWalletForm } from '@/components/wallet/add-wallet-form';

interface Wallet {
  currency: string;
}

export default async function NewWalletPage() {
  const res = await serverApi('/wallets');
  if (res.status === 401) redirect('/login');
  const wallets = (await res.json()) as Wallet[];
  return (
    <div className="space-y-6 lg:max-w-[560px]">
      <PageHeader title="Add a currency" description="Open a wallet in another currency." back={{ href: '/', label: 'Back' }} />
      <AddWalletForm held={wallets.map((w) => w.currency)} />
    </div>
  );
}
