'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest, toastApiError } from '@/lib/api/client';
import { ConfirmDialog } from '@/components/confirm-dialog';

export function RemoveAlertButton({ id, symbol }: { id: string; symbol?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const r = await apiRequest(`/api/alerts/${encodeURIComponent(id)}`, { method: 'DELETE' });
    setBusy(false);
    setOpen(false);
    if (!r.ok) return toastApiError(r.error);
    toast.success('Alert removed');
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Remove alert" className="-m-2 flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent/60 hover:text-foreground">
        <X className="size-4" aria-hidden />
      </button>
      <ConfirmDialog open={open} onOpenChange={setOpen} title={`Remove the ${symbol ?? ''} alert?`.replace('  ', ' ')} description="You can set it again any time." actionLabel="Remove alert" pending={busy} onConfirm={() => void remove()} />
    </>
  );
}
