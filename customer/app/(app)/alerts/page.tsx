import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BellPlus } from 'lucide-react';
import { serverApi } from '@/lib/api/server';
import { computeAlerts, type Alert, type PriceInfo } from '@/lib/alerts/compute';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { AlertList } from '@/components/alerts/alert-list';
import { PushToggle } from '@/components/alerts/push-toggle';

export default async function AlertsPage() {
  const [alertsRes, marketsRes] = await Promise.all([serverApi('/alerts'), serverApi('/markets')]);
  if (alertsRes.status === 401) redirect('/login');
  const alerts = alertsRes.ok ? ((await alertsRes.json()) as Alert[]) : [];
  const prices = marketsRes.ok ? ((await marketsRes.json()) as PriceInfo[]) : [];
  const rows = computeAlerts(alerts, prices);
  return (
    <div className="space-y-6 lg:max-w-[720px]">
      <PageHeader title="Price alerts" description="Checked automatically — you'll get a toast the moment one triggers.">
        <Link href="/alerts/new" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
          <BellPlus data-icon="inline-start" aria-hidden />
          New alert
        </Link>
      </PageHeader>
      <PushToggle />
      <AlertList rows={rows} />
    </div>
  );
}
