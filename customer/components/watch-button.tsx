'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';

export function WatchButton({
  symbol,
  type,
  followed,
}: {
  symbol: string;
  type: 'crypto' | 'stock';
  followed: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(followed);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !on;
    setOn(next); // optimistic
    const res = next
      ? await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ symbol, type }),
        })
      : await fetch(`/api/watchlist/${encodeURIComponent(symbol)}`, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) {
      setOn(!next); // revert on failure
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? `Unfollow ${symbol}` : `Follow ${symbol}`}
      className="p-1 text-muted-foreground"
    >
      <Star className={`size-5 ${on ? 'fill-primary text-primary' : ''}`} aria-hidden />
    </button>
  );
}
