'use client';

import { useRouter } from 'next/navigation';
import { CloudOff, ExternalLink, RefreshCw } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';

const REPO = 'https://github.com/fookoowei/MaxOne';

// Shown on Markets when the catalog is empty. On the hosted demo that means the free-tier price
// provider is rate-limiting the shared cloud IP — not an error in the app. A plain explanation
// for a visitor, and the two things they can do about it.
export function MarketDataNotice() {
  const router = useRouter();
  return (
    <section className="rounded-[20px] border bg-card p-5" role="status">
      <span className="flex size-10 items-center justify-center rounded-[14px] bg-status-pending/12 text-status-pending">
        <CloudOff className="size-5" aria-hidden />
      </span>
      <h2 className="mt-3 text-base font-semibold">Live market data is paused on this demo</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Our free-tier price provider limits requests from shared cloud servers, so quotes can&apos;t be loaded on the
        hosted demo right now. Live prices, charts and alerts work as designed when MaxOne runs locally or on a
        dedicated server — the README covers setup in a few minutes.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={REPO} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
          <ExternalLink data-icon="inline-start" aria-hidden />
          View on GitHub
        </a>
        <Button type="button" variant="outline" size="lg" onClick={() => router.refresh()}>
          <RefreshCw data-icon="inline-start" aria-hidden />
          Try again
        </Button>
      </div>
    </section>
  );
}
