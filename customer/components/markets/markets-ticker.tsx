import Link from 'next/link';
import { formatPrice } from '@/lib/format/price';
import { ChangeText } from '@/components/markets/change-text';
import { Panel } from '@/components/layout/panel';
import { CoinIcon } from '@/components/markets/coin-icon';
import type { WatchedAsset } from '@/components/wallet/watching-card';

// Desktop aside: the top few assets, server-rendered from the 15s-cached list. Hidden entirely
// when the catalog is empty (provider throttled) — an empty shell labelled "live · 15s" is worse
// than nothing.
export function MarketsTicker({ assets }: { assets: (WatchedAsset & { name: string })[] }) {
  if (assets.length === 0) return null;
  return (
    <Panel title="Markets" action={<span className="text-xs text-muted-foreground">live · 15s</span>}>
      <ul className="divide-y">
        {assets.slice(0, 4).map((a) => (
          <li key={a.symbol}>
            <Link href={`/markets/${a.id}`} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <CoinIcon src={a.image} symbol={a.symbol} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.symbol}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular">{formatPrice(a.price)}</p>
                <ChangeText pct={a.change24h} className="block text-xs tabular" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
