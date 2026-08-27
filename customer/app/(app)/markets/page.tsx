import { redirect } from 'next/navigation';
import Link from 'next/link';
import { serverApi } from '@/lib/api/server';
import { MarketList, type MarketAsset } from '@/components/market-list';

interface WatchItem {
  symbol: string;
}

export default async function MarketsPage() {
  const [marketsRes, watchRes] = await Promise.all([serverApi('/markets'), serverApi('/watchlist')]);
  if (marketsRes.status === 401) redirect('/login');

  const assets = marketsRes.ok ? ((await marketsRes.json()) as MarketAsset[]) : [];
  const watch = watchRes.ok ? ((await watchRes.json()) as WatchItem[]) : [];
  const followedSymbols = watch.map((w) => w.symbol);
  const followed = assets.filter((a) => followedSymbols.includes(a.symbol));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Markets</h1>
          <p className="text-sm text-muted-foreground">Live prices — informational only.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/portfolio" className="text-sm text-primary underline">
            Portfolio
          </Link>
          <Link href="/alerts" className="text-sm text-primary underline">
            Alerts
          </Link>
        </div>
      </header>

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
    </div>
  );
}
