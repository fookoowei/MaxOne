import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { roleHasPermission } from '@/lib/auth/permissions';
import { serverApi } from '@/lib/api/server';
import { apiQuery, parseTableParams } from '@/lib/table/params';
import { PageHeader } from '@/components/page-header';
import { AuditTable, AUDIT_TABLE, type AuditEntry } from '@/components/audit/audit-table';

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!roleHasPermission(user.role, 'audit.view')) {
    return <PageHeader title="Audit" description="You don't have access to the audit trail." />;
  }

  const params = parseTableParams(await searchParams, AUDIT_TABLE);
  const res = await serverApi(`/audit-logs?${apiQuery(params, { sort: false })}`);
  if (res.status === 401) redirect('/login');
  if (!res.ok) return <PageHeader title="Audit" description="Couldn't load the audit trail. Try again." />;

  const { logs, total } = (await res.json()) as { logs: AuditEntry[]; total: number };
  return (
    <div className="space-y-6">
      <PageHeader title="Audit" description="Every money and access decision, who made it, and what changed." />
      <AuditTable entries={logs} total={total} />
    </div>
  );
}
