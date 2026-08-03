import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { roleHasPermission } from '@/lib/auth/permissions';
import { serverApi } from '@/lib/api/server';
import { UsersTable, type StaffUser } from '@/components/users/users-table';

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

  const res = await serverApi('/users');
  if (res.status === 401) redirect('/login');
  if (!res.ok) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="mt-2 text-sm text-red-600">Couldn&apos;t load users. Try again.</p>
      </div>
    );
  }

  const { users } = (await res.json()) as { users: StaffUser[] };
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Users</h1>
      <UsersTable users={users} />
    </div>
  );
}
