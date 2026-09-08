import type { LucideIcon } from 'lucide-react';
import { ClipboardCheck, LayoutDashboard, ScrollText, Users, Wallet } from 'lucide-react';
import { roleHasPermission, type Permission } from '@/lib/auth/permissions';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission | null; // null = everyone
  badge?: 'pending'; // which live number decorates this item
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

// The console's map, grouped the way staff think about their day: what needs a decision, then
// the records, then administration. Each item maps to ONE representative permission from the seed —
// the UX side of RBAC (hide what the role can't use); the API still enforces.
const GROUPS: NavGroup[] = [
  { label: 'Overview', items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard, permission: null }] },
  {
    label: 'Operations',
    items: [
      { href: '/approvals', label: 'Approvals', icon: ClipboardCheck, permission: 'deposit.approve', badge: 'pending' },
      { href: '/wallets', label: 'Wallets', icon: Wallet, permission: 'transaction.view_all' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/users', label: 'Users', icon: Users, permission: 'user.manage' },
      { href: '/audit', label: 'Audit', icon: ScrollText, permission: 'audit.view' },
    ],
  },
];

export function navGroupsForRole(role: string): NavGroup[] {
  return GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.permission === null || roleHasPermission(role, i.permission)),
  })).filter((g) => g.items.length > 0);
}

export function isActivePath(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

/** Breadcrumb labels for the first path segment; deeper segments fall back to a noun. */
export const SEGMENT_LABELS: Record<string, string> = {
  '': 'Dashboard',
  approvals: 'Approvals',
  wallets: 'Wallets',
  users: 'Users',
  audit: 'Audit',
};
