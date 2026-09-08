'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { roleHasPermission, type Permission } from '@/lib/auth/permissions';
import { apiRequest, toastApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';

export function RowActions({
  id,
  type,
  role,
}: {
  id: string;
  type: 'deposit' | 'withdrawal';
  role: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'rejecting'>('idle');
  const [note, setNote] = useState('');
  const [acting, setActing] = useState<'approve' | 'reject' | null>(null);

  // The SAME permission gates approve AND reject — the backend uses assertApprovePermission
  // for both (deposit.reject/withdrawal.reject are only audit labels, not permissions).
  const permission: Permission = type === 'withdrawal' ? 'withdrawal.approve' : 'deposit.approve';
  const allowed = roleHasPermission(role, permission);
  const denyReason = allowed ? undefined : `Requires ${permission}`;

  async function settle(action: 'approve' | 'reject', body?: unknown) {
    setActing(action);
    try {
      const result = await apiRequest(`/api/transactions/${id}/${action}`, {
        method: 'POST',
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (result.ok) {
        toast.success(action === 'approve' ? 'Approved' : 'Rejected');
      } else {
        // 409 = someone else settled it first; the refresh below drops the row either way.
        toastApiError(result.error, { HTTP_409: 'Already reviewed by someone else.' });
      }
      router.refresh();
    } finally {
      setActing(null);
      setMode('idle');
    }
  }

  if (mode === 'rejecting') {
    return (
      <div className="flex flex-col gap-2">
        <textarea
          aria-label="Rejection note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason (optional)"
          className="w-48 rounded border px-2 py-1 text-sm"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            pending={acting === 'reject'}
            onClick={() => settle('reject', { note: note || undefined })}
          >
            Confirm reject
          </Button>
          <Button size="sm" variant="outline" disabled={acting !== null} onClick={() => setMode('idle')}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        disabled={!allowed || acting !== null}
        pending={acting === 'approve'}
        title={denyReason}
        onClick={() => settle('approve')}
      >
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={!allowed || acting !== null}
        title={denyReason}
        onClick={() => setMode('rejecting')}
      >
        Reject
      </Button>
    </div>
  );
}
