import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BellPlus } from 'lucide-react';
import { serverApi } from '@/lib/api/server';
import { computeAlerts, type Alert } from '@/lib/alerts/compute';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { WithAside } from '@/components/layout/with-aside';
import { AlertList } from '@/components/alerts/alert-list';
import { PushToggle } from '@/components/alerts/push-toggle';
import { MarketsTicker } from '@/components/markets/markets-ticker';
import type { MarketAsset } from '@/components/markets/market-list';

export default async function AlertsPage() {
  const [alertsRes, marketsRes] = await Promise.all([serverApi('/alerts'), serverApi('/markets')]);
  if (alertsRes.status === 401) redirect('/login');
  const alerts = alertsRes.ok ? ((await alertsRes.json()) as Alert[]) : [];
  // One /markets read feeds both the alert evaluation and the desktop ticker.
  const assets = marketsRes.ok ? ((await marketsRes.json()) as MarketAsset[]) : [];
  const rows = computeAlerts(alerts, assets);
  return (
    // PushToggle lives in the aside on desktop and in the column below it; exactly one is visible.
    <WithAside
      aside={
        <>
          <PushToggle stacked />
          <MarketsTicker assets={assets} />
        </>
      }
    >
      <div className="space-y-6">
        <PageHeader title="Price alerts" description="Checked automatically — you'll get a toast the moment one triggers.">
          <Link href="/alerts/new" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
            <BellPlus data-icon="inline-start" aria-hidden />
            New alert
          </Link>
        </PageHeader>
        <div className="xl:hidden">
          <PushToggle />
        </div>
        <AlertList rows={rows} />
      </div>
    </WithAside>
  );
}
