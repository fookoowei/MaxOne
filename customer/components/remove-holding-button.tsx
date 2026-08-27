'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

export function RemoveHoldingButton({ symbol }: { symbol: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/portfolio/${encodeURIComponent(symbol)}`, { method: 'DELETE' });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={remove}
      aria-label={`Remove ${symbol}`}
      className="p-1 text-muted-foreground"
    >
      <X className="size-4" aria-hidden />
    </button>
  );
}
