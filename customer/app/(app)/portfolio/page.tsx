import { redirect } from 'next/navigation';
import Link from 'next/link';
import { serverApi } from '@/lib/api/server';
import { computePortfolio, type Holding, type PriceInfo } from '@/lib/portfolio/compute';
import { PortfolioSummary } from '@/components/portfolio-summary';
import { HoldingList } from '@/components/holding-list';

export default async function PortfolioPage() {
  const [holdingsRes, marketsRes] = await Promise.all([serverApi('/portfolio'), serverApi('/markets')]);
  if (holdingsRes.status === 401) redirect('/login');

  const holdings = holdingsRes.ok ? ((await holdingsRes.json()) as Holding[]) : [];
  const prices = marketsRes.ok ? ((await marketsRes.json()) as PriceInfo[]) : [];
  const portfolio = computePortfolio(holdings, prices);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Portfolio</h1>
        <Link href="/portfolio/new" className="text-sm text-primary underline">
          Add holding
        </Link>
      </header>
      <PortfolioSummary totalValue={portfolio.totalValue} totalPnl={portfolio.totalPnl} />
      <HoldingList rows={portfolio.rows} />
    </div>
  );
}
