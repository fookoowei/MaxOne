import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { serverApi } from '@/lib/api/server';
import { computePortfolio, type Holding } from '@/lib/portfolio/compute';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { WithAside } from '@/components/layout/with-aside';
import { PortfolioSummary } from '@/components/portfolio/portfolio-summary';
import { HoldingList } from '@/components/portfolio/holding-list';
import { MarketsTicker } from '@/components/markets/markets-ticker';
import { AlertCtaCard } from '@/components/alerts/alert-cta-card';
import type { MarketAsset } from '@/components/markets/market-list';

export default async function PortfolioPage() {
  const [holdingsRes, marketsRes] = await Promise.all([serverApi('/portfolio'), serverApi('/markets')]);
  if (holdingsRes.status === 401) redirect('/login');
  const holdings = holdingsRes.ok ? ((await holdingsRes.json()) as Holding[]) : [];
  // One /markets read feeds both the valuation and the desktop ticker.
  const assets = marketsRes.ok ? ((await marketsRes.json()) as MarketAsset[]) : [];
  const portfolio = computePortfolio(holdings, assets);
  return (
    <WithAside
      aside={
        <>
          <MarketsTicker assets={assets} />
          <AlertCtaCard />
        </>
      }
    >
      <div className="space-y-6">
        <PageHeader title="Portfolio" description="What you hold, valued at today's prices." back={{ href: '/markets', label: 'Markets' }}>
          <Link href="/portfolio/new" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
            <Plus data-icon="inline-start" aria-hidden />
            Add holding
          </Link>
        </PageHeader>
        <PortfolioSummary totalValue={portfolio.totalValue} totalPnl={portfolio.totalPnl} />
        <HoldingList rows={portfolio.rows} />
      </div>
    </WithAside>
  );
}
