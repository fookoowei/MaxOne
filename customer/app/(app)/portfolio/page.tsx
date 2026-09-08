import { redirect } from 'next/navigation';
import Link from 'next/link';
import { serverApi } from '@/lib/api/server';
import { computePortfolio, type Holding, type PriceInfo } from '@/lib/portfolio/compute';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { PortfolioSummary } from '@/components/portfolio/portfolio-summary';
import { HoldingList } from '@/components/portfolio/holding-list';

export default async function PortfolioPage() {
  const [holdingsRes, marketsRes] = await Promise.all([serverApi('/portfolio'), serverApi('/markets')]);
  if (holdingsRes.status === 401) redirect('/login');
  const holdings = holdingsRes.ok ? ((await holdingsRes.json()) as Holding[]) : [];
  const prices = marketsRes.ok ? ((await marketsRes.json()) as PriceInfo[]) : [];
  const portfolio = computePortfolio(holdings, prices);
  return (
    <div className="space-y-6 lg:max-w-[720px]">
      <PageHeader title="Portfolio" description="What you hold, valued at today's prices." back={{ href: '/markets', label: 'Markets' }}>
        <Link href="/portfolio/new" className={buttonVariants({ variant: 'outline' })}>
          Add holding
        </Link>
      </PageHeader>
      <PortfolioSummary totalValue={portfolio.totalValue} totalPnl={portfolio.totalPnl} />
      <HoldingList rows={portfolio.rows} />
    </div>
  );
}
