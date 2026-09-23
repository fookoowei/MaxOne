'use client';

import { useEffect, type DependencyList } from 'react';
import type { Socket } from 'socket.io-client';
import { connectSocket } from './socket';

/**
 * Open the live socket for the life of a component: mint a ticket, connect, hand the socket to
 * `subscribe` to register listeners, disconnect on unmount. Real-time is always an enhancement —
 * if the ticket call fails the component simply keeps its server-rendered data. A connection that
 * finishes after unmount is dropped, never leaked.
 */
export function useSocket(subscribe: (socket: Socket) => void, deps: DependencyList): void {
  useEffect(() => {
    let socket: Socket | undefined;
    let cancelled = false;

    (async () => {
      const res = await fetch('/api/ws-ticket', { method: 'POST' });
      if (!res.ok || cancelled) return;
      const { ticket } = (await res.json()) as { ticket: string };
      if (cancelled) return;
      socket = connectSocket(ticket);
      subscribe(socket);
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
    // `subscribe` is a fresh closure each render by design; the caller names what it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
