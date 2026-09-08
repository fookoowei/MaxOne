'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MarketList, type MarketAsset } from '@/components/markets/market-list';
import { connectSocket } from '@/lib/realtime/socket';
import { mergeLivePrices } from '@/lib/markets/live-prices';

type Chip = 'all' | 'watching' | 'gainers' | 'losers';
const CHIPS: { key: Chip; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'watching', label: 'Watching' },
  { key: 'gainers', label: 'Gainers' },
  { key: 'losers', label: 'Losers' },
];

// The market list with a search box and four chips, over the same live-price socket as before:
// the SSR catalog renders first, the numbers tick when the socket connects.
export function MarketsView({ initialAssets, followedSymbols }: { initialAssets: MarketAsset[]; followedSymbols: string[] }) {
  const [assets, setAssets] = useState(initialAssets);
  const [q, setQ] = useState('');
  const [chip, setChip] = useState<Chip>('all');

  useEffect(() => {
    let socket: Socket | undefined;
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/ws-ticket', { method: 'POST' });
      if (!res.ok || cancelled) return; // live prices are an enhancement — the SSR list stays
      const { ticket } = (await res.json()) as { ticket: string };
      if (cancelled) return;
      socket = connectSocket(ticket);
      socket.on('prices.updated', (incoming: MarketAsset[]) => setAssets((prev) => mergeLivePrices(prev, incoming)));
    })();
    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, []);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return assets
      .filter((a) => !needle || a.name.toLowerCase().includes(needle) || a.symbol.toLowerCase().includes(needle))
      .filter((a) => (chip === 'watching' ? followedSymbols.includes(a.symbol) : chip === 'gainers' ? a.change24h >= 0 : chip === 'losers' ? a.change24h < 0 : true))
      .sort((a, b) => (chip === 'gainers' ? b.change24h - a.change24h : chip === 'losers' ? a.change24h - b.change24h : 0));
  }, [assets, q, chip, followedSymbols]);

  const empty = chip === 'watching' && !q ? 'Star assets to build your watchlist.' : q ? `Nothing matches “${q}”.` : undefined;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input aria-label="Search coins" placeholder="Search coins" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 pl-10 text-base" />
      </div>
      <div className="flex gap-2" role="group" aria-label="Filter">
        {CHIPS.map((c) => (
          <Button key={c.key} type="button" size="sm" className="h-9 rounded-full px-3.5" variant={chip === c.key ? 'default' : 'outline'} aria-pressed={chip === c.key} onClick={() => setChip(c.key)}>
            {c.label}
          </Button>
        ))}
      </div>
      <section className="rounded-[20px] border bg-card px-4 py-1">
        <MarketList assets={visible} followedSymbols={followedSymbols} emptyText={empty} />
      </section>
    </div>
  );
}
