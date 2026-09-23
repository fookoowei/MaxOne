'use client';

import { toast } from 'sonner';
import { useSocket } from '@/lib/realtime/use-socket';

interface NotificationEvent {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

// App-wide socket island — mounted once in the layout so any notification can toast on any page.
export function NotificationToaster() {
  useSocket((socket) => {
    socket.on('notification', (p: NotificationEvent) => toast(p.title, { description: p.body }));
  }, []);

  return null;
}
