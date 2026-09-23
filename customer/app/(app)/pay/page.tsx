import Link from 'next/link';
import { Send, QrCode, ScanLine, ChevronRight } from 'lucide-react';
import { serverApi } from '@/lib/api/server';
import { formatMoney } from '@/lib/format/money';
import { PageHeader } from '@/components/layout/page-header';
import { WithAside } from '@/components/layout/with-aside';
import { CardLink } from '@/components/layout/card-link';
import { Enter } from '@/components/layout/enter';
import { QuickActions } from '@/components/wallet/quick-actions';
import { WalletList, type WalletSummary } from '@/components/wallet/wallet-list';
import { ActivityCard, type Transaction } from '@/components/wallet/activity-card';

export const metadata = { title: 'Wallet' };

const payActions = [
  { href: '/pay/send', label: 'Send', hint: 'To anyone by their handle', icon: Send },
  { href: '/pay/receive', label: 'Receive', hint: 'Show your QR code', icon: QrCode },
  { href: '/pay/scan', label: 'Scan to pay', hint: 'Point your camera at a code', icon: ScanLine },
];

const TRANSFERS = new Set(['transfer_in', 'transfer_out']);

/**
 * The Wallet tab, shaped like the reference's wallet screen: the balance, the four money actions,
 * every currency held, then the ways to pay someone. Both reads are enhancements — the actions
 * render regardless.
 */
export default async function WalletPage() {
  const wallets = await serverApi('/wallets').then(async (r) => (r.ok ? ((await r.json()) as WalletSummary[]) : [])).catch(() => [] as WalletSummary[]);
  const primary = wallets[0];
  const transfers = primary
    ? await serverApi(`/wallets/${primary.id}/transactions`)
        .then(async (r) => (r.ok ? ((await r.json()) as Transaction[]) : []))
        .then((rows) => rows.filter((t) => TRANSFERS.has(t.type)))
        .catch(() => [] as Transaction[])
    : [];
  const recent = primary ? (
    <ActivityCard
      title="Recent transfers"
      transactions={transfers}
      currency={primary.currency}
      limit={5}
      seeAllHref="/activity"
      empty={{ title: 'No transfers yet', description: 'Send money to someone by their @handle.' }}
    />
  ) : undefined;

  return (
    <WithAside aside={recent}>
      <div className="space-y-5 md:space-y-6">
        <PageHeader title="Wallet" />

        {primary && (
          <Enter i={0}>
            <p className="text-sm text-muted-foreground">Total balance</p>
            <p className="mt-1 text-[34px] font-bold leading-none tracking-tight tabular min-[360px]:text-[40px]">{formatMoney(primary.balance, primary.currency)}</p>
          </Enter>
        )}

        <Enter i={1}>
          <QuickActions />
        </Enter>

        {wallets.length > 0 && (
          <Enter i={2}>
            <section className="rounded-[20px] border bg-card px-4 py-1">
              <div className="flex items-center justify-between py-3">
                <h2 className="text-sm font-semibold">Your currencies</h2>
                <CardLink href="/wallets/new">Add</CardLink>
              </div>
              <WalletList wallets={wallets} />
            </section>
          </Enter>
        )}

        <Enter i={3}>
          <h2 className="mb-3 text-sm font-semibold">Pay</h2>
          <div className="grid gap-3">
            {payActions.map(({ href, label, hint, icon: Icon }) => (
              <Link key={href} href={href} className="flex min-h-16 items-center gap-4 rounded-2xl border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-accent">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="flex-1">
                  <span className="block">{label}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{hint}</span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            ))}
          </div>
        </Enter>

        {recent && (
          <Enter i={4} className="xl:hidden">
            {recent}
          </Enter>
        )}
      </div>
    </WithAside>
  );
}
