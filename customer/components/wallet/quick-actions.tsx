import Link from 'next/link';
import { ArrowDownToLine, ArrowUpFromLine, ArrowUpDown, Send } from 'lucide-react';

const ACTIONS = [
  { href: '/deposit', label: 'Add money', icon: ArrowDownToLine },
  { href: '/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
  { href: '/pay/send', label: 'Send', icon: Send },
  { href: '/convert', label: 'Convert', icon: ArrowUpDown },
];

// The four money actions as tiles under the balance — each a 52px target with a label, so Send
// and Convert stop hiding in text links.
export function QuickActions() {
  return (
    <nav aria-label="Quick actions" className="grid grid-cols-4 gap-3">
      {ACTIONS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="flex flex-col items-center gap-2 rounded-2xl py-1 text-xs font-medium hover:bg-accent/40">
          <span className="flex size-13 items-center justify-center rounded-[18px] bg-accent text-accent-foreground">
            <Icon className="size-[22px]" aria-hidden />
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}
