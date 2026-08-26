import { redirect } from 'next/navigation';
import Link from 'next/link';
import { serverApi } from '@/lib/api/server';
import { ConvertForm } from '@/components/convert-form';
import type { WalletSummary } from '@/components/wallet-list';

export default async function ConvertPage() {
  const res = await serverApi('/wallets');
  if (res.status === 401) redirect('/login');
  const wallets = (await res.json()) as WalletSummary[];

  if (wallets.length < 2) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <Link href="/" className="text-sm text-muted-foreground">
            ← Back
          </Link>
          <h1 className="text-xl font-semibold">Convert</h1>
        </header>
        <p className="text-sm text-muted-foreground">
          Add another currency wallet first.{' '}
          <Link href="/wallets/new" className="text-primary underline">
            Add a currency
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/" className="text-sm text-muted-foreground">
          ← Back
        </Link>
        <h1 className="text-xl font-semibold">Convert</h1>
      </header>
      <ConvertForm wallets={wallets} />
    </div>
  );
}
