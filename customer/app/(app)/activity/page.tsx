import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/api/server';
import { PageHeader } from '@/components/layout/page-header';
import { ActivityCard, type Transaction } from '@/components/wallet/activity-card';

interface Wallet { id: string; currency: string }

export default async function ActivityPage() {
  const res = await serverApi('/wallets');
  if (res.status === 401) redirect('/login');
  const wallets = (await res.json()) as Wallet[];
  const primary = wallets[0];
  if (!primary) redirect('/');
  const txRes = await serverApi(`/wallets/${primary.id}/transactions`);
  const transactions = txRes.ok ? ((await txRes.json()) as Transaction[]) : [];
  return (
    <div className="space-y-6 lg:max-w-[720px]">
      <PageHeader title="Activity" description="Everything that has moved in or out of your wallet." back={{ href: '/', label: 'Home' }} />
      <ActivityCard transactions={transactions} currency={primary.currency} title="All activity" />
    </div>
  );
}
