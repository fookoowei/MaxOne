import Link from 'next/link';
import { BellPlus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

// Desktop aside on Portfolio: the one thing a holder wants next to their holdings.
export function AlertCtaCard() {
  return (
    <section className="rounded-[20px] border bg-card p-4">
      <h2 className="text-sm font-semibold">Price alerts</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Get told the moment a price crosses your line.</p>
      <Link href="/alerts/new" className={buttonVariants({ variant: 'outline', className: 'mt-3 h-10 w-full' })}>
        <BellPlus data-icon="inline-start" aria-hidden />
        Set a price alert
      </Link>
    </section>
  );
}
