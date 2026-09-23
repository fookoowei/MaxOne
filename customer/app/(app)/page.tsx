import { redirect } from 'next/navigation';
import { serverApi, serverApiJson } from '@/lib/api/server';
import { getSessionUser } from '@/lib/auth/session';
import { WithAside } from '@/components/layout/with-aside';
import { IconLink } from '@/components/layout/icon-link';
import { ArrowUpDown, Plus } from 'lucide-react';
import { HomeHero } from '@/components/wallet/home-hero';
import { Enter } from '@/components/layout/enter';
import { Panel } from '@/components/layout/panel';
import { QuickActions } from '@/components/wallet/quick-actions';
import { ActivityCard, type Transaction } from '@/components/wallet/activity-card';
import { WalletList } from '@/components/wallet/wallet-list';
import { WatchingCard } from '@/components/wallet/watching-card';
import { PendingCard } from '@/components/wallet/pending-card';
import { MarketsTicker } from '@/components/markets/markets-ticker';

interface Wallet { id: string; name: string; currency: string; balance: number }
interface Asset { id: string; symbol: string; name: string; price: number; change24h: number }

// Reads run in a Server Component: the proxy has already refreshed an expired access token before
// render, so a 401 here is terminal → send the user to log in. Markets/watchlist are enhancements:
// if either fails the home still renders.
export default async function HomePage() {
  const session = await getSessionUser();
  const walletsRes = await serverApi('/wallets');
  if (walletsRes.status === 401) redirect('/login');
  const wallets = (await walletsRes.json()) as Wallet[];
  const primary = wallets[0]; // foundation: exactly one auto-created USD wallet

  const [transactions, assets, watched] = await Promise.all([
    primary ? serverApi(`/wallets/${primary.id}/transactions`).then(async (r) => (r.ok ? ((await r.json()) as Transaction[]) : [])) : [],
    serverApiJson<Asset[]>('/markets', []),
    serverApiJson<{ symbol: string }[]>('/watchlist', []),
  ]);
  const watchedSymbols = new Set(watched.map((w) => w.symbol));
  const watching = assets.filter((a) => watchedSymbols.has(a.symbol));
  const pendingCount = transactions.filter((t) => t.status === 'pending').length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const name = session?.firstName ? `${session.firstName} ${session.lastName ?? ''}`.trim() : 'Your wallet';
  const currency = primary?.currency ?? 'USD';

  return (
    <WithAside
      aside={
        primary && (
          <>
            <PendingCard transactions={transactions} currency={currency} />
            <MarketsTicker assets={assets} />
          </>
        )
      }
    >
      <div className="space-y-5 md:space-y-6">
        <HomeHero greeting={greeting} name={name} handle={session?.handle} wallet={primary} pendingCount={pendingCount} />

        <Enter i={1}>
          <QuickActions />
        </Enter>

        {wallets.length > 1 && (
          <Enter i={2}>
            <Panel
              title="Your currencies"
              action={
                <div className="flex gap-2">
                  <IconLink href="/convert" label="Exchange" icon={ArrowUpDown} />
                  <IconLink href="/wallets/new" label="Add a currency" icon={Plus} />
                </div>
              }
            >
              <WalletList wallets={wallets} />
            </Panel>
          </Enter>
        )}

        <Enter i={3}>
          <ActivityCard title="Transactions" grouped transactions={transactions} currency={currency} limit={6} seeAllHref="/activity" />
        </Enter>
        <Enter i={4}>
          <WatchingCard assets={watching} />
        </Enter>
      </div>
    </WithAside>
  );
}
