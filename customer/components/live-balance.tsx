'use client';

import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { BalanceCard } from '@/components/balance-card';
import { connectSocket } from '@/lib/realtime/socket';

interface BalanceEvent {
  walletId: string;
  currency: string;
  balance: number;
}

export function LiveBalance({
  walletId,
  currency,
  initialBalance,
}: {
  walletId: string;
  currency: string;
  initialBalance: number;
}) {
  const [balance, setBalance] = useState(initialBalance);

  useEffect(() => {
    let socket: Socket | undefined;
    let cancelled = false;

    (async () => {
      const res = await fetch('/api/ws-ticket', { method: 'POST' });
      if (!res.ok || cancelled) return; // real-time is an enhancement — SSR balance stays
      const { ticket } = (await res.json()) as { ticket: string };
      if (cancelled) return;
      socket = connectSocket(ticket);
      socket.on('balance.updated', (p: BalanceEvent) => {
        if (p.walletId === walletId) setBalance(p.balance);
      });
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [walletId]);

  return <BalanceCard balance={balance} currency={currency} />;
}
