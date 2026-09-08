'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiRequest, toastApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { StaffUser } from './users-table';

export interface Role {
  id: string;
  name: string;
}

type Pending = { kind: 'status'; next: 'active' | 'suspended' } | { kind: 'role'; next: string } | null;

// Access decisions confirm first, in plain words, then call the BFF once.
export function UserRowActions({ user, roles, currentUserId, currentUserRole }: { user: StaffUser; roles: Role[]; currentUserId: string; currentUserRole: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const isSelf = user.id === currentUserId; // SoD: can't change your own status/role
  // Only a super_admin may assign super_admin, so hide that option otherwise.
  const roleOptions = roles.filter((r) => r.name !== 'super_admin' || currentUserRole === 'super_admin');
  const items = Object.fromEntries(roleOptions.map((r) => [r.name, r.name.replace('_', ' ')]));

  async function run() {
    if (!confirm) return;
    setBusy(true);
    try {
      const path = confirm.kind === 'status' ? `/api/users/${user.id}/status` : `/api/users/${user.id}/role`;
      const payload = confirm.kind === 'status' ? { status: confirm.next } : { role: confirm.next };
      const result = await apiRequest(path, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      if (result.ok) {
        toast.success(confirm.kind === 'status' ? (confirm.next === 'suspended' ? 'User suspended' : 'User reactivated') : `Role changed to ${confirm.next.replace('_', ' ')}`);
        router.refresh();
      } else {
        toastApiError(result.error, { HTTP_403: 'Not allowed.' });
      }
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const title =
    confirm?.kind === 'status'
      ? `${confirm.next === 'suspended' ? 'Suspend' : 'Reactivate'} ${user.email}?`
      : confirm?.kind === 'role'
        ? `Change ${user.email}'s role?`
        : '';
  const description =
    confirm?.kind === 'status'
      ? confirm.next === 'suspended'
        ? 'They will be signed out and unable to log in until reactivated. Their wallets and history are untouched.'
        : 'They will be able to log in again with the access their role grants.'
      : confirm?.kind === 'role'
        ? `From ${user.role.name.replace('_', ' ')} to ${confirm.next.replace('_', ' ')}. Takes effect on their next request.`
        : '';
  const actionLabel = confirm?.kind === 'status' ? (confirm.next === 'suspended' ? 'Suspend user' : 'Reactivate user') : 'Change role';

  return (
    <div className="flex items-center gap-2">
      <Select value={user.role.name} onValueChange={(v) => v && v !== user.role.name && setConfirm({ kind: 'role', next: String(v) })} items={items} disabled={isSelf || busy}>
        <SelectTrigger aria-label={`Role for ${user.email}`} size="sm" className="w-32 capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roleOptions.map((r) => (
            <SelectItem key={r.id} value={r.name} className="capitalize">
              {r.name.replace('_', ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant={user.status === 'active' ? 'outline' : 'default'} disabled={isSelf || busy} title={isSelf ? 'You cannot change your own status' : undefined} onClick={() => setConfirm({ kind: 'status', next: user.status === 'active' ? 'suspended' : 'active' })}>
        {user.status === 'active' ? 'Suspend' : 'Reactivate'}
      </Button>
      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && !busy && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button variant={confirm?.kind === 'status' && confirm.next === 'suspended' ? 'destructive' : 'default'} pending={busy} onClick={() => void run()}>
              {actionLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
