'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

export function RemoveAlertButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/alerts/${encodeURIComponent(id)}`, { method: 'DELETE' });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <button type="button" onClick={remove} aria-label="Remove alert" className="p-1 text-muted-foreground">
      <X className="size-4" aria-hidden />
    </button>
  );
}
