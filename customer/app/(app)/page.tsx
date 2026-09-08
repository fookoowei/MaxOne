import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { serverApi } from '@/lib/api/server';
import { getSessionUser } from '@/lib/auth/session';
import { formatMoney } from '@/lib/format/money';
import { WithAside } from '@/components/layout/with-aside';
import { LiveBalance } from '@/components/live-balance';
import { QuickActions } from '@/components/wallet/quick-actions';
import { ActivityCard, type Transaction } from '@/components/wallet/activity-card';
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
    serverApi('/markets').then(async (r) => (r.ok ? ((await r.json()) as Asset[]) : [])).catch(() => [] as Asset[]),
    serverApi('/watchlist').then(async (r) => (r.ok ? ((await r.json()) as { symbol: string }[]) : [])).catch(() => [] as { symbol: string }[]),
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
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{greeting}</p>
            <h1 className="text-lg font-semibold lg:text-2xl">{name}</h1>
          </div>
          <Link href="/alerts" aria-label="Price alerts" className="flex size-10 items-center justify-center rounded-[14px] border bg-card hover:bg-accent/40">
            <Bell className="size-5" aria-hidden />
          </Link>
        </header>

        {primary ? (
          <LiveBalance walletId={primary.id} currency={primary.currency} initialBalance={primary.balance} pendingCount={pendingCount} />
        ) : (
          <p className="text-sm text-muted-foreground">No wallet found for your account.</p>
        )}

        <QuickActions />

        {wallets.length > 1 && (
          <section className="rounded-[20px] border bg-card px-4 py-1">
            <div className="flex items-center justify-between py-3">
              <h2 className="text-sm font-semibold">Your currencies</h2>
              <div className="flex gap-3 text-[13px] font-medium">
                <Link href="/convert" className="text-primary">Convert</Link>
                <Link href="/wallets/new" className="text-primary">Add</Link>
              </div>
            </div>
            <ul className="divide-y">
              {wallets.map((w) => (
                <li key={w.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-medium">{w.currency}</span>
                  <span className="font-semibold tabular">{formatMoney(w.balance, w.currency)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <ActivityCard transactions={transactions} currency={currency} limit={5} seeAllHref="/activity" />
        <WatchingCard assets={watching} />
      </div>
    </WithAside>
  );
}
