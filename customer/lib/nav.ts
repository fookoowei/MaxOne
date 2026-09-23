import type { LucideIcon } from 'lucide-react';
import { Home, TrendingUp, User, Wallet } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// The four places a customer goes. One list, three shapes (tabs / rail / sidebar) in AppNav.
export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/pay', label: 'Wallet', icon: Wallet },
  { href: '/markets', label: 'Markets', icon: TrendingUp },
  { href: '/profile', label: 'Profile', icon: User },
];

export function isActivePath(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
