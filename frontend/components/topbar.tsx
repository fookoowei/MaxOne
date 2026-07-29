'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { SessionUser } from '@/lib/auth/cookie-names';

export function Topbar({ user }: { user: SessionUser }) {
  const router = useRouter();

  async function logout() {
    // BFF revokes the refresh token and clears the cookies; then the proxy
    // will bounce any further navigation back to /login.
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <span className="text-sm font-semibold">Wallet Console</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {user.email} · <span className="capitalize">{user.role.replace('_', ' ')}</span>
        </span>
        <Button variant="outline" size="sm" onClick={logout}>
          Log out
        </Button>
      </div>
    </header>
  );
}
