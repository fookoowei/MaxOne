import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Coins } from 'lucide-react';
import { serverApi } from '@/lib/api/server';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { ConvertForm } from '@/components/wallet/convert-form';
import type { WalletSummary } from '@/components/wallet/wallet-list';

export default async function ConvertPage() {
  const res = await serverApi('/wallets');
  if (res.status === 401) redirect('/login');
  const wallets = (await res.json()) as WalletSummary[];
  return (
    <div className="space-y-6 lg:max-w-[560px]">
      <PageHeader title="Convert" description="Move money between your currency wallets." back={{ href: '/', label: 'Back' }} />
      {wallets.length < 2 ? (
        <EmptyState
          icon={Coins}
          title="Add a second currency first"
          description="Converting needs two wallets — one to take from and one to put into."
          action={
            <Link href="/wallets/new" className={buttonVariants({ size: 'xl' })}>
              Add a currency
            </Link>
          }
        />
      ) : (
        <ConvertForm wallets={wallets} />
      )}
    </div>
  );
}
