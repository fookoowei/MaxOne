'use client';

import { useEffect, useState } from 'react';
import { subscribeToPush, unsubscribeFromPush } from '@/lib/push/subscribe';

export function PushToggle() {
  const [perm, setPerm] = useState<NotificationPermission>('default');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if ('Notification' in window) setPerm(Notification.permission);
  }, []);

  if (perm === 'denied') {
    return (
      <p className="text-xs text-muted-foreground">Notifications are blocked in your browser settings.</p>
    );
  }

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

  return perm === 'granted' ? (
    <button onClick={disable} disabled={busy} className="text-xs text-primary underline">
      🔔 Notifications on · turn off
    </button>
  ) : (
    <button onClick={enable} disabled={busy} className="text-xs text-primary underline">
      🔔 Enable push notifications
    </button>
  );
}
