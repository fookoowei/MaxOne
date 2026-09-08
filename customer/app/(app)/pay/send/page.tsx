import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/api/server';
import { PageHeader } from '@/components/layout/page-header';
import { SendMoneyWizard } from '@/components/pay/send-money-wizard';

interface Wallet { id: string; currency: string; balance: number }

export default async function SendPage({ searchParams }: { searchParams: Promise<{ handle?: string }> }) {
  const { handle } = await searchParams;
  const res = await serverApi('/wallets');
  if (res.status === 401) redirect('/login');
  const wallets = (await res.json()) as Wallet[];
  const primary = wallets[0];
  if (!primary) redirect('/');
  return (
    <div className="space-y-6 lg:max-w-[560px]">
      <PageHeader title="Send money" description="Instant, no fee, between MaxOne wallets." back={{ href: '/pay', label: 'Pay' }} />
      <SendMoneyWizard myWalletId={primary.id} myCurrency={primary.currency} balance={primary.balance} prefillHandle={handle ?? ''} />
    </div>
  );
}
