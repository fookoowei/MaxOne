import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/api/server';
import { PageHeader } from '@/components/layout/page-header';
import { MoneyRequestWizard } from '@/components/wallet/money-request-wizard';

interface Wallet { id: string; currency: string; balance: number }

export default async function Page() {
  const res = await serverApi('/wallets');
  if (res.status === 401) redirect('/login');
  const wallets = (await res.json()) as Wallet[];
  const primary = wallets[0];
  if (!primary) redirect('/');
  return (
    <div className="space-y-6 lg:max-w-[560px]">
      <PageHeader title="Add money" description="Request a deposit into your wallet." back={{ href: '/', label: 'Back' }} />
      <MoneyRequestWizard mode="deposit" walletId={primary.id} currency={primary.currency} balance={primary.balance} />
    </div>
  );
}
