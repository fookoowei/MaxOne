import Link from 'next/link';
import { ArrowDownToLine, ArrowUpFromLine, ArrowUpDown, Send } from 'lucide-react';

const ACTIONS = [
  { href: '/deposit', label: 'Deposit', icon: ArrowDownToLine },
  { href: '/pay/send', label: 'Send', icon: Send },
  { href: '/convert', label: 'Exchange', icon: ArrowUpDown },
  { href: '/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
];

// The four money actions as tiles under the balance — each a card in its own right, icon over
// label, that fills with the brand colour while pressed (the tap-highlight from the reference).
export function QuickActions() {
  return (
    <nav aria-label="Quick actions" className="grid grid-cols-4 gap-2 sm:gap-3">
      {ACTIONS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-[20px] border bg-card px-1 text-[11px] font-medium sm:text-xs transition-[background-color,color,border-color,transform] duration-200 hover:bg-accent/40 active:scale-[0.97] active:border-primary active:bg-primary active:text-primary-foreground"
        >
          <Icon className="size-[22px]" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
