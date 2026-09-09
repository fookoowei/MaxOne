'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

// The customer app had a logout *route* since M6 but never a button (found 2026-09-09).
// POST /api/auth/logout revokes this device's refresh token and clears the cookies; it always
// answers 204 (clearing locally is what logs you out), so there's no error path to show.
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.push('/login');
    router.refresh();
  }

  return (
    <Button variant="secondary" className="w-full" pending={pending} onClick={signOut}>
      <LogOut aria-hidden />
      Sign out
    </Button>
  );
}
