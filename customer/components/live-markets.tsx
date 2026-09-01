'use client';

import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { MarketList, type MarketAsset } from '@/components/market-list';
import { connectSocket } from '@/lib/realtime/socket';
import { mergeLivePrices } from '@/lib/markets/live-prices';

export function LiveMarkets({
  initialAssets,
  followedSymbols,
}: {
  initialAssets: MarketAsset[];
  followedSymbols: string[];
}) {
  const [assets, setAssets] = useState(initialAssets);

  useEffect(() => {
    let socket: Socket | undefined;
    let cancelled = false;

    (async () => {
      const res = await fetch('/api/ws-ticket', { method: 'POST' });
      if (!res.ok || cancelled) return; // live prices are an enhancement — SSR list stays
      const { ticket } = (await res.json()) as { ticket: string };
      if (cancelled) return;
      socket = connectSocket(ticket);
      socket.on('prices.updated', (incoming: MarketAsset[]) =>
        setAssets((prev) => mergeLivePrices(prev, incoming)),
      );
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, []);

  const followed = assets.filter((a) => followedSymbols.includes(a.symbol));

  return (
    <>
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Your watchlist</h2>
        {followed.length > 0 ? (
          <MarketList assets={followed} followedSymbols={followedSymbols} />
        ) : (
          <p className="py-4 text-sm text-muted-foreground">Star assets to build your watchlist.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">All</h2>
        <MarketList assets={assets} followedSymbols={followedSymbols} />
      </section>
    </>
  );
}
