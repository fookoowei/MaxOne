import { redirect } from 'next/navigation';
import Link from 'next/link';
import { serverApi } from '@/lib/api/server';
import { AddAlertForm } from '@/components/add-alert-form';

interface Asset {
  symbol: string;
  name: string;
}

export default async function NewAlertPage() {
  const res = await serverApi('/markets');
  if (res.status === 401) redirect('/login');
  const assets = res.ok ? ((await res.json()) as Asset[]) : [];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/alerts" className="text-sm text-muted-foreground">
          ← Back
        </Link>
        <h1 className="text-xl font-semibold">New price alert</h1>
      </header>
      <AddAlertForm assets={assets.map((a) => ({ symbol: a.symbol, name: a.name }))} />
    </div>
  );
}
