import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { roleHasPermission } from '@/lib/auth/permissions';
import { serverApi } from '@/lib/api/server';
import { apiQuery, parseTableParams } from '@/lib/table/params';
import { PageHeader } from '@/components/page-header';
import { UsersTable, USERS_TABLE, type StaffUser } from '@/components/users/users-table';
import type { Role } from '@/components/users/user-row-actions';

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!roleHasPermission(user.role, 'user.manage')) {
    return <PageHeader title="Users" description="You don't have access to user management." />;
  }

  const params = parseTableParams(await searchParams, USERS_TABLE);
  const [uRes, rRes] = await Promise.all([serverApi(`/users?${apiQuery(params)}`), serverApi('/roles')]);
  if (uRes.status === 401 || rRes.status === 401) redirect('/login');
  if (!uRes.ok || !rRes.ok) return <PageHeader title="Users" description="Couldn't load users. Try again." />;

  const { users, total } = (await uRes.json()) as { users: StaffUser[]; total: number };
  const roles = (await rRes.json()) as Role[];
  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Accounts, roles and access. You can't change your own." />
      <UsersTable users={users} total={total} roles={roles} currentUserId={user.id} currentUserRole={user.role} />
    </div>
  );
}
