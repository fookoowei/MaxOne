import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { serverApi } from '@/lib/api/server';
import { AssetHeader, type AssetDetail } from '@/components/markets/asset-header';
import { PriceChart } from '@/components/markets/price-chart';

interface ChartData {
  points: number[];
  labels: string[];
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [assetRes, chartRes] = await Promise.all([
    serverApi(`/markets/${id}`),
    serverApi(`/markets/${id}/chart?days=7`),
  ]);
  if (assetRes.status === 401) redirect('/login');
  if (!assetRes.ok) redirect('/markets'); // 404 unknown id

  const asset = (await assetRes.json()) as AssetDetail;
  const chart = chartRes.ok ? ((await chartRes.json()) as ChartData) : { points: [], labels: [] };

  return (
    <div className="space-y-6 lg:max-w-[720px]">
      <Link href="/markets" className="-ml-1 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-[18px]" aria-hidden />
        Markets
      </Link>
      <AssetHeader asset={asset} />
      <PriceChart id={id} initial={chart} />
    </div>
  );
}
