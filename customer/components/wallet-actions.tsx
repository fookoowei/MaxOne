import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

// The two primary money actions, sitting under the balance hero on the dashboard.
// Links styled as buttons (this Button has no asChild/Slot, so we style the anchor).
export function WalletActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link href="/deposit" className={buttonVariants()}>
        Add money
      </Link>
      <Link href="/withdraw" className={buttonVariants({ variant: 'outline' })}>
        Withdraw
      </Link>
    </div>
  );
}
