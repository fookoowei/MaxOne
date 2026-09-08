'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest, toastApiError } from '@/lib/api/client';
import { ConfirmDialog } from '@/components/layout/confirm-dialog';

export function RemoveHoldingButton({ symbol }: { symbol: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const r = await apiRequest(`/api/portfolio/${encodeURIComponent(symbol)}`, { method: 'DELETE' });
    setBusy(false);
    setOpen(false);
    if (!r.ok) return toastApiError(r.error);
    toast.success(`${symbol} removed from your portfolio`);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Remove ${symbol}`} className="-m-2 flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent/60 hover:text-foreground">
        <X className="size-4" aria-hidden />
      </button>
      <ConfirmDialog open={open} onOpenChange={setOpen} title={`Remove ${symbol} from your portfolio?`} description="This only removes what you track here. It does not sell anything." actionLabel={`Remove ${symbol}`} pending={busy} onConfirm={() => void remove()} />
    </>
  );
}
