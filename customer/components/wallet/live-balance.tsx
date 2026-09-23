'use client';

import { useState } from 'react';
import { BalanceCard } from '@/components/wallet/balance-card';
import { useSocket } from '@/lib/realtime/use-socket';

interface BalanceEvent {
  walletId: string;
  currency: string;
  balance: number;
}

export function LiveBalance({
  walletId,
  currency,
  initialBalance,
  pendingCount = 0,
  variant = 'card',
}: {
  walletId: string;
  currency: string;
  initialBalance: number;
  pendingCount?: number;
  variant?: 'card' | 'hero';
}) {
  const [balance, setBalance] = useState(initialBalance);

  useSocket((socket) => {
    socket.on('balance.updated', (p: BalanceEvent) => {
      if (p.walletId === walletId) setBalance(p.balance);
    });
  }, [walletId]);

  return <BalanceCard balance={balance} currency={currency} pendingCount={pendingCount} variant={variant} />;
}
