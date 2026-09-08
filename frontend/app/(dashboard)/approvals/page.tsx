import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { roleHasPermission } from '@/lib/auth/permissions';
import { serverApi } from '@/lib/api/server';
import { PageHeader } from '@/components/page-header';
import { ApprovalsTable, type PendingTransaction } from '@/components/approvals/approvals-table';

// Server Component: runs only on the Next server, so it can await data directly and
// render the table before any HTML reaches the browser (no client fetch, no spinner).
export default async function ApprovalsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  // UX-only gate (the nav already hides the link); NestJS still enforces on the fetch.
  if (!roleHasPermission(user.role, 'transaction.view_all')) {
    return <PageHeader title="Approvals" description="You don't have access to the approvals queue." />;
  }

  const res = await serverApi('/transactions/pending');
  if (res.status === 401) redirect('/login');
  if (!res.ok) {
    return <PageHeader title="Approvals" description="Couldn't load the queue. Try again." />;
  }

  const rows = (await res.json()) as PendingTransaction[];
  return (
    <div className="space-y-6">
      <PageHeader title="Approvals" description={rows.length ? `${rows.length} request${rows.length === 1 ? '' : 's'} waiting for a decision.` : 'Deposits and withdrawals that need a decision.'} />
      <ApprovalsTable rows={rows} role={user.role} />
    </div>
  );
}
