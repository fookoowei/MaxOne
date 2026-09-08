import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { roleHasPermission } from '@/lib/auth/permissions';
import { serverApi } from '@/lib/api/server';
import { apiQuery, parseTableParams } from '@/lib/table/params';
import { PageHeader } from '@/components/page-header';
import { WalletsTable, WALLETS_TABLE, type StaffWallet } from '@/components/wallets/wallets-table';

// Server Component: the URL is the table state. Parse it, ask the API for exactly that page
// (Postgres sorts/filters/paginates), render. A shared link reproduces the same view.
export default async function WalletsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!roleHasPermission(user.role, 'transaction.view_all')) {
    return <PageHeader title="Wallets" description="You don't have access to wallets." />;
  }

  const params = parseTableParams(await searchParams, WALLETS_TABLE);
  const res = await serverApi(`/admin/wallets?${apiQuery(params)}`);
  if (res.status === 401) redirect('/login');
  if (!res.ok) return <PageHeader title="Wallets" description="Couldn't load wallets. Try again." />;

  const { wallets, total } = (await res.json()) as { wallets: StaffWallet[]; total: number };
  return (
    <div className="space-y-6">
      <PageHeader title="Wallets" description="Every customer wallet, searchable by name or owner." />
      <WalletsTable wallets={wallets} total={total} />
    </div>
  );
}
