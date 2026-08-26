import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/api/server';
import { MarketList, type MarketAsset } from '@/components/market-list';

export default async function MarketsPage() {
  const res = await serverApi('/markets');
  if (res.status === 401) redirect('/login');
  const assets = res.ok ? ((await res.json()) as MarketAsset[]) : [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Markets</h1>
        <p className="text-sm text-muted-foreground">Live prices — informational only.</p>
      </header>
      <MarketList assets={assets} />
    </div>
  );
}
