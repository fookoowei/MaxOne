'use client';

import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { connectSocket } from '@/lib/realtime/socket';
import { AssetHeader, type AssetDetail } from '@/components/markets/asset-header';
import { PriceChart } from '@/components/markets/price-chart';
import type { Candle } from '@/lib/chart/candles';

interface LivePrice { symbol: string; price: number; change24h: number }

// The header and the chart must show the SAME number, so they take it from the same event.
// Market cap is price x supply, so it scales with the price rather than waiting for a refetch.
export function applyLive(asset: AssetDetail, incoming: LivePrice[]): AssetDetail {
  const live = incoming.find((p) => p.symbol === asset.symbol);
  if (!live) return asset;
  const supply = asset.price > 0 ? asset.marketCap / asset.price : 0;
  return {
    ...asset,
    price: live.price,
    change24h: live.change24h,
    marketCap: supply * live.price,
    high24h: Math.max(asset.high24h, live.price),
    low24h: asset.low24h > 0 ? Math.min(asset.low24h, live.price) : live.price,
  };
}

// Until v2a's follow-up (v2b) puts a Kraken WebSocket behind the API, "live" means the existing
// 15s price-stream tick. Before this component the detail page never updated at all — only the
// market LIST merged prices.updated.
export function AssetLive({ asset: initial, chart }: { asset: AssetDetail; chart: { candles: Candle[] } }) {
  const [asset, setAsset] = useState(initial);

  useEffect(() => {
    let socket: Socket | undefined;
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/ws-ticket', { method: 'POST' });
      if (!res.ok || cancelled) return; // live is an enhancement; the SSR page stands on its own
      const { ticket } = (await res.json()) as { ticket: string };
      if (cancelled) return;
      socket = connectSocket(ticket);
      socket.on('prices.updated', (incoming: LivePrice[]) =>
        setAsset((prev) => applyLive(prev, incoming)),
      );
    })();
    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, []);

  return (
    <>
      <AssetHeader asset={asset} />
      <PriceChart id={asset.id} initial={chart} live={asset.price} />
    </>
  );
}
