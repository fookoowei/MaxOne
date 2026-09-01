'use client';

import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { connectSocket } from '@/lib/realtime/socket';
import { formatPrice } from '@/lib/format/price';

interface AlertEvent {
  id: string;
  symbol: string;
  direction: string;
  targetPrice: number;
  price: number;
}

// App-wide socket island — mounted once in the layout so an alert toast can pop on ANY page.
export function AlertToaster() {
  useEffect(() => {
    let socket: Socket | undefined;
    let cancelled = false;

    (async () => {
      const res = await fetch('/api/ws-ticket', { method: 'POST' });
      if (!res.ok || cancelled) return;
      const { ticket } = (await res.json()) as { ticket: string };
      if (cancelled) return;
      socket = connectSocket(ticket);
      socket.on('alert.triggered', (p: AlertEvent) => {
        const dir = p.direction === 'above' ? 'above' : 'below';
        toast(`🔔 ${p.symbol} crossed ${dir} ${formatPrice(p.targetPrice)}`, {
          description: `now ${formatPrice(p.price)}`,
        });
      });
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, []);

  return null;
}
