'use client';

import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { connectSocket } from '@/lib/realtime/socket';

interface NotificationEvent {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

// App-wide socket island — mounted once in the layout so any notification can toast on any page.
export function NotificationToaster() {
  useEffect(() => {
    let socket: Socket | undefined;
    let cancelled = false;

    (async () => {
      const res = await fetch('/api/ws-ticket', { method: 'POST' });
      if (!res.ok || cancelled) return;
      const { ticket } = (await res.json()) as { ticket: string };
      if (cancelled) return;
      socket = connectSocket(ticket);
      socket.on('notification', (p: NotificationEvent) => toast(p.title, { description: p.body }));
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, []);

  return null;
}
