import { redirect } from 'next/navigation';
import Link from 'next/link';
import { serverApi } from '@/lib/api/server';
import { computeAlerts, type Alert, type PriceInfo } from '@/lib/alerts/compute';
import { AlertList } from '@/components/alert-list';
import { PushToggle } from '@/components/push-toggle';

export default async function AlertsPage() {
  const [alertsRes, marketsRes] = await Promise.all([serverApi('/alerts'), serverApi('/markets')]);
  if (alertsRes.status === 401) redirect('/login');

  const alerts = alertsRes.ok ? ((await alertsRes.json()) as Alert[]) : [];
  const prices = marketsRes.ok ? ((await marketsRes.json()) as PriceInfo[]) : [];
  const rows = computeAlerts(alerts, prices);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Price alerts</h1>
        <Link href="/alerts/new" className="text-sm text-primary underline">
          New alert
        </Link>
      </header>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Checked automatically — you&apos;ll get a toast the moment one triggers.
        </p>
        <PushToggle />
      </div>
      <AlertList rows={rows} />
    </div>
  );
}
