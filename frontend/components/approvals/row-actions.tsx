'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { roleHasPermission, type Permission } from '@/lib/auth/permissions';
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The SAME permission gates approve AND reject — the backend uses assertApprovePermission
  // for both (deposit.reject/withdrawal.reject are only audit labels, not permissions).
  const permission: Permission = type === 'withdrawal' ? 'withdrawal.approve' : 'deposit.approve';
  const allowed = roleHasPermission(role, permission);
  const denyReason = allowed ? undefined : `Requires ${permission}`;

  async function settle(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        setError(res.status === 409 ? 'Already reviewed.' : 'Action failed.');
      }
      // Refresh either way: on 409 the row is gone; on success it's settled — the
      // Server Component re-fetches and the row drops off the queue.
      router.refresh();
    } finally {
      setBusy(false);
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
            disabled={busy}
            onClick={() => settle(`/api/transactions/${id}/reject`, { note: note || undefined })}
          >
            Confirm reject
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setMode('idle')}>
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
        disabled={!allowed || busy}
        title={denyReason}
        onClick={() => settle(`/api/transactions/${id}/approve`)}
      >
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={!allowed || busy}
        title={denyReason}
        onClick={() => setMode('rejecting')}
      >
        Reject
      </Button>
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}
