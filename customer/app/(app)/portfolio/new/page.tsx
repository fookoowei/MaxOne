import { redirect } from 'next/navigation';
import Link from 'next/link';
import { serverApi } from '@/lib/api/server';
import { AddHoldingForm } from '@/components/add-holding-form';

interface Asset {
  symbol: string;
  name: string;
}

export default async function NewHoldingPage() {
  const res = await serverApi('/markets');
  if (res.status === 401) redirect('/login');
  const assets = res.ok ? ((await res.json()) as Asset[]) : [];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/portfolio" className="text-sm text-muted-foreground">
          ← Back
        </Link>
        <h1 className="text-xl font-semibold">Add a holding</h1>
      </header>
      <AddHoldingForm assets={assets.map((a) => ({ symbol: a.symbol, name: a.name }))} />
    </div>
  );
}
