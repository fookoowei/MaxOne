import type { ReactNode } from 'react';
import { AppNav, type NavUser } from './app-nav';

// Nav + content. The content column's width is decided by each page (PageColumn / WithAside),
// the shell only owns the gutters: phone 20px + room for the tab bar, tablet 32px, desktop 48px.
export function AppShell({ user, children }: { user: NavUser; children: ReactNode }) {
  return (
    <div className="min-h-dvh md:flex">
      <AppNav user={user} />
      <main className="w-full min-w-0 flex-1 px-5 pt-6 pb-28 md:px-8 md:py-8 lg:px-12 lg:py-10">{children}</main>
    </div>
  );
}
