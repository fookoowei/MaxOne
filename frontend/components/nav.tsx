'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { roleHasPermission, type Permission } from '@/lib/auth/permissions';
import { LinkPending } from '@/components/link-pending';

interface NavItem {
  href: string;
  label: string;
  // The permission a role must hold to see this link. null = always visible.
  permission: Permission | null;
}

// Each link maps to one representative permission from the seed. This is the
// UX side of RBAC: hide what the role can't use. The backend still enforces.
const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', permission: null },
  { href: '/approvals', label: 'Approvals', permission: 'deposit.approve' },
  { href: '/wallets', label: 'Wallets', permission: 'transaction.view_all' },
  { href: '/users', label: 'Users', permission: 'user.manage' },
  { href: '/audit', label: 'Audit', permission: 'audit.view' },
];

export function Nav({ role }: { role: string }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter(
    (item) => item.permission === null || roleHasPermission(role, item.permission),
  );

  return (
    <nav className="flex flex-col gap-1 p-4">
      {items.map((item) => {
        const active =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
            )}
          >
            {item.label}
            <LinkPending className="text-muted-foreground" />
          </Link>
        );
      })}
    </nav>
  );
}
