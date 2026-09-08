'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { apiRequest } from '@/lib/api/client';
import { cn } from '@/lib/utils';

// Filled vs outline (not hue alone) says watched or not; a 44px hit area around an 18px icon.
export function WatchButton({ symbol, type, followed }: { symbol: string; type: 'crypto' | 'stock'; followed: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(followed);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !on;
    setOn(next); // optimistic
    const r = next
      ? await apiRequest('/api/watchlist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ symbol, type }) })
      : await apiRequest(`/api/watchlist/${encodeURIComponent(symbol)}`, { method: 'DELETE' });
    setBusy(false);
    if (!r.ok) {
      setOn(!next); // revert on failure
      return;
    }
    router.refresh();
  }

  return (
    <button type="button" onClick={toggle} aria-pressed={on} aria-label={on ? `Unfollow ${symbol}` : `Follow ${symbol}`} className={cn('-m-2 flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-accent/60', on ? 'text-primary' : 'text-muted-foreground')}>
      <Star className={cn('size-[18px]', on && 'fill-current')} aria-hidden />
    </button>
  );
}
