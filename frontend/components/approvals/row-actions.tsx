'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { roleHasPermission, type Permission } from '@/lib/auth/permissions';
import { apiRequest, toastApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ApproveDialog, RejectDialog, type DecisionSubject } from './decision-dialogs';

export function RowActions({ id, subject, role, size = 'sm' }: { id: string; subject: DecisionSubject; role: string; size?: 'sm' | 'xs' }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<'approve' | 'reject' | null>(null);
  const [pending, setPending] = useState(false);

  // The SAME permission gates approve AND reject — the backend uses assertApprovePermission for
  // both (deposit.reject/withdrawal.reject are only audit labels, not permissions).
  const permission: Permission = subject.type === 'withdrawal' ? 'withdrawal.approve' : 'deposit.approve';
  const allowed = roleHasPermission(role, permission);
  const denyReason = allowed ? undefined : `Requires ${permission}`;

  async function settle(action: 'approve' | 'reject', body?: unknown) {
    setPending(true);
    try {
      const result = await apiRequest(`/api/transactions/${id}/${action}`, {
        method: 'POST',
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (result.ok) toast.success(action === 'approve' ? `${cap(subject.type)} approved` : `${cap(subject.type)} rejected`);
      else toastApiError(result.error, { HTTP_409: 'Already reviewed by someone else.' });
      // Refresh either way: on 409 the row is gone; on success it's settled.
      router.refresh();
    } finally {
      setPending(false);
      setDialog(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size={size} disabled={!allowed} title={denyReason} onClick={() => setDialog('approve')}>
        Approve
      </Button>
      <Button size={size} variant="outline" disabled={!allowed} title={denyReason} onClick={() => setDialog('reject')}>
        Reject
      </Button>
      <ApproveDialog open={dialog === 'approve'} onOpenChange={(o) => !o && setDialog(null)} subject={subject} pending={pending} onConfirm={() => settle('approve')} />
      <RejectDialog open={dialog === 'reject'} onOpenChange={(o) => !o && setDialog(null)} subject={subject} pending={pending} onConfirm={(note) => settle('reject', { note: note || undefined })} />
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
