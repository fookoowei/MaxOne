'use client';

import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { DataTable, DataTablePagination, DataTableToolbar, type Column } from '@/components/data-table';
import { USERS_TABLE } from '@/lib/table/configs';
import { UserRowActions, type Role } from './user-row-actions';

export interface StaffUser {
  id: string;
  email: string;
  handle?: string;
  firstName: string;
  lastName: string;
  status: 'active' | 'suspended';
  createdAt?: string;
  role: { id: string; name: string };
}


export function UsersTable({ users, total, roles, currentUserId, currentUserRole }: { users: StaffUser[]; total: number; roles: Role[]; currentUserId: string; currentUserRole: string }) {
  const columns: Column<StaffUser>[] = [
    {
      key: 'user',
      header: 'User',
      sortField: 'email',
      cell: (u) => (
        <span className="grid leading-tight">
          <span className="font-medium">
            {u.firstName} {u.lastName}
            {u.id === currentUserId && <Badge variant="secondary" className="ml-2 align-middle">you</Badge>}
          </span>
          <span className="text-xs text-muted-foreground">{u.email}</span>
        </span>
      ),
    },
    { key: 'handle', header: 'Handle', cell: (u) => <span className="text-muted-foreground">{u.handle ? `@${u.handle}` : '—'}</span> },
    { key: 'role', header: 'Role', cell: (u) => <Badge variant="outline" className="capitalize">{u.role.name.replace('_', ' ')}</Badge> },
    { key: 'status', header: 'Status', sortField: 'status', cell: (u) => <StatusBadge status={u.status} /> },
    { key: 'created', header: 'Joined', sortField: 'createdAt', cell: (u) => <span className="text-muted-foreground">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</span> },
    { key: 'actions', header: '', cell: (u) => (u.id === currentUserId ? null : <UserRowActions user={u} roles={roles} currentUserId={currentUserId} currentUserRole={currentUserRole} />) },
  ];
  return (
    <div className="space-y-3">
      <DataTableToolbar
        cfg={USERS_TABLE}
        searchPlaceholder="Search name, email or handle"
        filters={[
          { key: 'role', label: 'Role', allLabel: 'All roles', options: roles.map((r) => ({ value: r.name, label: r.name.replace('_', ' ') })) },
          { key: 'status', label: 'Status', allLabel: 'All statuses', options: [{ value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }] },
        ]}
      />
      <DataTable columns={columns} rows={users} getRowId={(u) => u.id} cfg={USERS_TABLE} caption="Users" emptyState={<EmptyState icon={Users} title="No users match" description="Try another name, email, role or status." />} />
      <DataTablePagination cfg={USERS_TABLE} total={total} />
    </div>
  );
}
