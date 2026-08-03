import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { roleHasPermission } from '@/lib/auth/permissions';
import { serverApi } from '@/lib/api/server';
import { AuditTable, type AuditEntry } from '@/components/audit/audit-table';

export default async function AuditPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  if (!roleHasPermission(user.role, 'audit.view')) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Audit</h1>
        <p className="mt-2 text-sm text-muted-foreground">You don&apos;t have access to the audit trail.</p>
      </div>
    );
  }

  const res = await serverApi('/audit-logs');
  if (res.status === 401) redirect('/login');
  if (!res.ok) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Audit</h1>
        <p className="mt-2 text-sm text-red-600">Couldn&apos;t load the audit trail. Try again.</p>
      </div>
    );
  }

  const { logs } = (await res.json()) as { logs: AuditEntry[] };
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Audit</h1>
      <AuditTable entries={logs} />
    </div>
  );
}
