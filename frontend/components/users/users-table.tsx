import { UserRowActions, type Role } from './user-row-actions';

export interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'active' | 'suspended';
  role: { id: string; name: string };
}

export function UsersTable({
  users,
  roles,
  currentUserId,
  currentUserRole,
}: {
  users: StaffUser[];
  roles: Role[];
  currentUserId: string;
  currentUserRole: string;
}) {
  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">No users.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-2 font-medium">Email</th>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Role</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b last:border-0">
              <td className="px-4 py-2">{u.email}</td>
              <td className="px-4 py-2">{u.firstName} {u.lastName}</td>
              <td className="px-4 py-2">{u.role.name}</td>
              <td className="px-4 py-2 capitalize">{u.status}</td>
              <td className="px-4 py-2">
                <UserRowActions
                  user={u}
                  roles={roles}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
