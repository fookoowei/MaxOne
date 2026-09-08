import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/api/server';
import { PageHeader } from '@/components/layout/page-header';
import { AddHoldingForm } from '@/components/portfolio/add-holding-form';

interface Asset {
  symbol: string;
  name: string;
}

export default async function NewHoldingPage() {
  const res = await serverApi('/markets');
  if (res.status === 401) redirect('/login');
  const assets = res.ok ? ((await res.json()) as Asset[]) : [];
  return (
    <div className="space-y-6 lg:max-w-[560px]">
      <PageHeader title="Add a holding" description="Track something you own elsewhere." back={{ href: '/portfolio', label: 'Portfolio' }} />
      <AddHoldingForm assets={assets.map((a) => ({ symbol: a.symbol, name: a.name }))} />
    </div>
  );
}
