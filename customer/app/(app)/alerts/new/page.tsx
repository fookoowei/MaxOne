import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/api/server';
import { PageHeader } from '@/components/layout/page-header';
import { AddAlertForm } from '@/components/alerts/add-alert-form';

interface Asset {
  symbol: string;
  name: string;
}

export default async function NewAlertPage() {
  const res = await serverApi('/markets');
  if (res.status === 401) redirect('/login');
  const assets = res.ok ? ((await res.json()) as Asset[]) : [];
  return (
    <div className="space-y-6 lg:max-w-[560px]">
      <PageHeader title="New price alert" description="We'll tell you when a price crosses your line." back={{ href: '/alerts', label: 'Alerts' }} />
      <AddAlertForm assets={assets.map((a) => ({ symbol: a.symbol, name: a.name }))} />
    </div>
  );
}
