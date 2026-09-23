import Link from 'next/link';
import { BellPlus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Panel } from '@/components/layout/panel';

// Desktop aside on Portfolio: the one thing a holder wants next to their holdings.
export function AlertCtaCard() {
  return (
    <Panel padded title="Price alerts">
      <p className="mt-0.5 text-xs text-muted-foreground">Get told the moment a price crosses your line.</p>
      <Link href="/alerts/new" className={buttonVariants({ variant: 'outline', className: 'mt-3 h-10 w-full' })}>
        <BellPlus data-icon="inline-start" aria-hidden />
        Set a price alert
      </Link>
    </Panel>
  );
}
