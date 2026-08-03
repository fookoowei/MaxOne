'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { StaffUser } from './users-table';

export interface Role {
  id: string;
  name: string;
}

export function UserRowActions({
  user,
  roles,
  currentUserId,
  currentUserRole,
}: {
  user: StaffUser;
  roles: Role[];
  currentUserId: string;
  currentUserRole: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSelf = user.id === currentUserId; // SoD: can't change your own status/role
  // Only a super_admin may assign super_admin, so hide that option otherwise.
  const roleOptions = roles.filter((r) => r.name !== 'super_admin' || currentUserRole === 'super_admin');

  async function patch(path: string, payload: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError(res.status === 403 ? 'Not allowed.' : 'Action failed.');
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={isSelf || busy}
        title={isSelf ? 'You cannot change your own status' : undefined}
        onClick={() =>
          patch(`/api/users/${user.id}/status`, {
            status: user.status === 'active' ? 'suspended' : 'active',
          })
        }
      >
        {user.status === 'active' ? 'Suspend' : 'Reactivate'}
      </Button>

      <select
        aria-label={`Role for ${user.email}`}
        value={user.role.name}
        disabled={isSelf || busy}
        title={isSelf ? 'You cannot change your own role' : undefined}
        onChange={(e) => {
          if (e.target.value !== user.role.name) {
            patch(`/api/users/${user.id}/role`, { role: e.target.value });
          }
        }}
        className="rounded border px-2 py-1 text-sm disabled:opacity-50"
      >
        {roleOptions.map((r) => (
          <option key={r.id} value={r.name}>
            {r.name}
          </option>
        ))}
      </select>

      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}
