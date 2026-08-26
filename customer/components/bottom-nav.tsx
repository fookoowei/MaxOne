'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Send, TrendingUp, User } from 'lucide-react';

const tabs = [
  { label: 'Home', icon: Home, href: '/' },
  { label: 'Pay', icon: Send, href: '/pay' },
  { label: 'Markets', icon: TrendingUp, href: '/markets' },
  { label: 'Profile', icon: User, href: null },
];

// Bottom tab bar. Home + Pay are live; Cards/Profile stay disabled placeholders (later slices).
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-[420px] border-t bg-card/90 backdrop-blur">
      {tabs.map(({ label, icon: Icon, href }) => {
        const active = href === '/' ? pathname === '/' : href ? pathname.startsWith(href) : false;
        const cls = `flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium ${
          active ? 'text-primary' : 'text-muted-foreground/50'
        }`;
        return href ? (
          <Link key={label} href={href} aria-current={active ? 'page' : undefined} className={cls}>
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        ) : (
          <div key={label} className={cls}>
            <Icon className="size-5" aria-hidden />
            {label}
          </div>
        );
      })}
    </nav>
  );
}
