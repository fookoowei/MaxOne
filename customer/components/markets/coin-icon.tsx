'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * A coin's logo, with the lettered badge we used to show as its fallback — not an afterthought:
 * when the price provider is throttled the API returns no image at all, and a broken-image glyph
 * would be worse than the lettering. Decorative (`alt=""` + aria-hidden) because the coin's name
 * or symbol is always in text next to it.
 *
 * A plain <img>, deliberately, not next/image: next.config.ts declares no remotePatterns (so
 * next/image would throw on CoinGecko's hostname), and the optimizer would bill per source image
 * for five logos that already sit behind a 15s server cache.
 */
export function CoinIcon({ src, symbol, className }: { src?: string; symbol: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        className={cn('flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground', className)}
        aria-hidden
      >
        {symbol.slice(0, 4)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- see the note above: no optimizer.
    <img
      src={src}
      alt=""
      aria-hidden
      loading="lazy"
      className={cn('size-9 shrink-0 rounded-full bg-secondary object-contain', className)}
      onError={() => setFailed(true)}
    />
  );
}
