import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { roleHasPermission } from '@/lib/auth/permissions';
import { serverApi } from '@/lib/api/server';
import { WalletsTable, type StaffWallet } from '@/components/wallets/wallets-table';

export default async function WalletsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  if (!roleHasPermission(user.role, 'transaction.view_all')) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Wallets</h1>
        <p className="mt-2 text-sm text-muted-foreground">You don&apos;t have access to wallets.</p>
      </div>
    );
  }

  const res = await serverApi('/admin/wallets');
  if (res.status === 401) redirect('/login');
  if (!res.ok) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Wallets</h1>
        <p className="mt-2 text-sm text-red-600">Couldn&apos;t load wallets. Try again.</p>
      </div>
    );
  }

  const { wallets } = (await res.json()) as { wallets: StaffWallet[] };
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Wallets</h1>
      <WalletsTable wallets={wallets} />
    </div>
  );
}
