import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { roleHasPermission } from '@/lib/auth/permissions';
import { serverApi } from '@/lib/api/server';
import { ApprovalsTable, type PendingTransaction } from '@/components/approvals/approvals-table';

// Server Component: runs only on the Next server, so it can await data directly and
// render the table before any HTML reaches the browser (no client fetch, no spinner).
export default async function ApprovalsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  // UX-only gate (the nav already hides the link); NestJS still enforces on the fetch.
  if (!roleHasPermission(user.role, 'transaction.view_all')) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Approvals</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don&apos;t have access to the approvals queue.
        </p>
      </div>
    );
  }

  const res = await serverApi('/transactions/pending');
  if (res.status === 401) redirect('/login');
  if (!res.ok) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Approvals</h1>
        <p className="mt-2 text-sm text-red-600">Couldn&apos;t load the queue. Try again.</p>
      </div>
    );
  }

  const rows = (await res.json()) as PendingTransaction[];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Approvals</h1>
      <ApprovalsTable rows={rows} role={user.role} />
    </div>
  );
}
