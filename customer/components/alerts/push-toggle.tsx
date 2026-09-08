'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { subscribeToPush, unsubscribeFromPush } from '@/lib/push/subscribe';

// One row: what push does, and a button that reads as its current state.
export function PushToggle() {
  const [perm, setPerm] = useState<NotificationPermission>('default');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if ('Notification' in window) setPerm(Notification.permission);
  }, []);

  async function enable() {
    setBusy(true);
    await subscribeToPush();
    if ('Notification' in window) setPerm(Notification.permission);
    setBusy(false);
  }

  async function disable() {
    setBusy(true);
    await unsubscribeFromPush();
    setBusy(false);
    setPerm('default');
  }

  const on = perm === 'granted';
  return (
    <div className="flex flex-col gap-3 rounded-[20px] border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">Push notifications</p>
        <p className="text-xs text-muted-foreground">
          {perm === 'denied'
            ? 'Blocked in your browser settings.'
            : on
              ? 'On — alerts reach you even with the app closed.'
              : 'Get alerts even with the app closed.'}
        </p>
      </div>
      {perm !== 'denied' && (
        <Button variant={on ? 'outline' : 'default'} size="sm" pending={busy} onClick={on ? disable : enable}>
          {on ? <BellOff aria-hidden /> : <Bell aria-hidden />}
          {on ? 'Notifications on · turn off' : 'Enable push notifications'}
        </Button>
      )}
    </div>
  );
}
