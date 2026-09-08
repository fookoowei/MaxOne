'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LinkPending } from '@/components/link-pending';
import { NAV_ITEMS, isActivePath } from '@/lib/nav';
import { cn } from '@/lib/utils';

export interface NavUser {
  name: string;
  handle?: string;
}

const Mark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 512 512" className={className} aria-hidden>
    <path d="M136 372V150l120 132 120-132v222" fill="none" stroke="currentColor" strokeWidth="54" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * One navigation, three shapes, chosen by CSS breakpoint (no JS media queries, no layout flash):
 *  ≤767  bottom tab bar (thumb reach)
 *  768+  icon rail, 72px, labels under icons
 *  1024+ sidebar, 240px, with the mark and who is signed in
 * Same items, same active rule, same pending indicator in all three.
 */
export function AppNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.map((i) => ({ ...i, active: isActivePath(i.href, pathname) }));
  const initials = user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'ME';

  return (
    <>
      {/* phone: bottom tabs */}
      <nav aria-label="Primary" data-shape="tabs" className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {items.map(({ href, label, icon: Icon, active }) => (
          <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={cn('flex min-h-11 flex-1 flex-col items-center gap-1 py-3 text-xs font-medium', active ? 'text-primary' : 'text-muted-foreground')}>
            <span className="relative">
              <Icon className="size-5" aria-hidden />
              <LinkPending className="absolute -top-1 -right-2 text-primary" />
            </span>
            {label}
          </Link>
        ))}
      </nav>

      {/* tablet: icon rail */}
      <nav aria-label="Primary" data-shape="rail" className="sticky top-0 hidden h-dvh w-[72px] shrink-0 flex-col items-center gap-2 border-r bg-background py-5 md:flex lg:hidden">
        <Link href="/" aria-label="MaxOne home" className="mb-3 flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Mark className="size-5" />
        </Link>
        {items.map(({ href, label, icon: Icon, active }) => (
          <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={cn('flex w-14 flex-col items-center gap-1 rounded-[14px] py-2.5 text-xs font-medium', active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/60')}>
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>

      {/* desktop: sidebar */}
      <nav aria-label="Primary" data-shape="sidebar" className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r bg-background px-3 py-5 lg:flex">
        <Link href="/" className="mb-4 flex items-center gap-2.5 px-2 py-1.5">
          <span className="flex size-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground"><Mark className="size-[18px]" /></span>
          <span className="text-base font-bold">MaxOne</span>
        </Link>
        {items.map(({ href, label, icon: Icon, active }) => (
          <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={cn('flex h-10 items-center gap-2.5 rounded-xl px-3 font-medium', active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground')}>
            <Icon className="size-[18px]" aria-hidden />
            {label}
            <LinkPending className="ml-auto text-muted-foreground" />
          </Link>
        ))}
        <div className="flex-1" />
        <Link href="/profile" className="flex items-center gap-2.5 border-t px-2 pt-3">
          <span className="flex size-8 items-center justify-center rounded-[10px] bg-secondary text-xs font-bold text-secondary-foreground">{initials}</span>
          <span className="grid leading-tight">
            <span className="text-[13px] font-medium">{user.name}</span>
            {user.handle && <span className="text-xs text-muted-foreground">@{user.handle}</span>}
          </span>
        </Link>
      </nav>
    </>
  );
}
