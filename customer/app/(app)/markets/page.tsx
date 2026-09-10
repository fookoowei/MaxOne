import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BellRing, PieChart } from 'lucide-react';
import { serverApi } from '@/lib/api/server';
import { buttonVariants } from '@/components/ui/button';
import { CardLink } from '@/components/layout/card-link';
import { computePortfolio, type Holding, type PriceInfo } from '@/lib/portfolio/compute';
import { formatPrice } from '@/lib/format/price';
import { PageHeader } from '@/components/layout/page-header';
import { WithAside } from '@/components/layout/with-aside';
import type { MarketAsset } from '@/components/markets/market-list';
import { MarketsView } from '@/components/markets/markets-view';
import { FeaturedAsset } from '@/components/markets/featured-asset';

interface WatchItem { symbol: string }

export default async function MarketsPage() {
  const [marketsRes, watchRes, holdingsRes] = await Promise.all([serverApi('/markets'), serverApi('/watchlist'), serverApi('/portfolio')]);
  if (marketsRes.status === 401) redirect('/login');
  const assets = marketsRes.ok ? ((await marketsRes.json()) as MarketAsset[]) : [];
  const watch = watchRes.ok ? ((await watchRes.json()) as WatchItem[]) : [];
  const holdings = holdingsRes.ok ? ((await holdingsRes.json()) as Holding[]) : [];
  const followedSymbols = watch.map((w) => w.symbol);
  const featured = assets.find((a) => followedSymbols.includes(a.symbol)) ?? assets[0];
  const chart = featured ? await serverApi(`/markets/${featured.id}/chart?days=7`).then(async (r) => (r.ok ? ((await r.json()) as { points: number[]; labels: string[] }) : { points: [], labels: [] })).catch(() => ({ points: [], labels: [] })) : null;
  const portfolio = computePortfolio(holdings, assets as unknown as PriceInfo[]);

  return (
    <WithAside
      aside={
        <>
          {featured && chart && <FeaturedAsset asset={featured} chart={chart} />}
          <section className="rounded-[20px] border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Your portfolio</h2>
              <CardLink href="/portfolio">Open</CardLink>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">Holdings you track, not custody.</p>
            {assets.length > 0 ? (
              <>
                <p className="mt-3 text-xl font-bold tabular">{formatPrice(portfolio.totalValue)}</p>
                <p className={`text-xs tabular ${portfolio.totalPnl >= 0 ? 'text-status-approved' : 'text-destructive'}`}>
                  {portfolio.totalPnl >= 0 ? '+' : ''}
                  {formatPrice(portfolio.totalPnl)} total P/L
                </p>
              </>
            ) : (
              // Without prices computePortfolio yields $0.00, which would read as a real balance.
              <p className="mt-3 text-sm text-muted-foreground">Valued once live prices are back.</p>
            )}
          </section>
        </>
      }
    >
      <div className="space-y-5">
        <PageHeader title="Markets" description={assets.length > 0 ? 'Live prices, informational only.' : 'Informational only.'}>
          <Link href="/portfolio" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
            <PieChart data-icon="inline-start" aria-hidden />
            Portfolio
          </Link>
          <Link href="/alerts" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
            <BellRing data-icon="inline-start" aria-hidden />
            Alerts
          </Link>
        </PageHeader>
        <MarketsView initialAssets={assets} followedSymbols={followedSymbols} />
      </div>
    </WithAside>
  );
}
