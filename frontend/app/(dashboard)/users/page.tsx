import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { roleHasPermission } from '@/lib/auth/permissions';
import { serverApi } from '@/lib/api/server';
import { UsersTable, type StaffUser } from '@/components/users/users-table';
import type { Role } from '@/components/users/user-row-actions';

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  if (!roleHasPermission(user.role, 'user.manage')) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="mt-2 text-sm text-muted-foreground">You don&apos;t have access to user management.</p>
      </div>
    );
  }

  const [uRes, rRes] = await Promise.all([serverApi('/users'), serverApi('/roles')]);
  if (uRes.status === 401 || rRes.status === 401) redirect('/login');
  if (!uRes.ok || !rRes.ok) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="mt-2 text-sm text-red-600">Couldn&apos;t load users. Try again.</p>
      </div>
    );
  }

  const { users } = (await uRes.json()) as { users: StaffUser[] };
  const roles = (await rRes.json()) as Role[];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Users</h1>
      <UsersTable users={users} roles={roles} currentUserId={user.id} currentUserRole={user.role} />
    </div>
  );
}
