import Link from 'next/link';
import { Send, QrCode, ScanLine, ChevronRight } from 'lucide-react';
import { serverApi } from '@/lib/api/server';
import { PageHeader } from '@/components/layout/page-header';
import { WithAside } from '@/components/layout/with-aside';
import { ActivityCard, type Transaction } from '@/components/wallet/activity-card';

interface Wallet { id: string; currency: string }

const actions = [
  { href: '/pay/send', label: 'Send', hint: 'To anyone by their handle', icon: Send },
  { href: '/pay/receive', label: 'Receive', hint: 'Show your QR code', icon: QrCode },
  { href: '/pay/scan', label: 'Scan to pay', hint: 'Point your camera at a code', icon: ScanLine },
];

const TRANSFERS = new Set(['transfer_in', 'transfer_out']);

export default async function PayPage() {
  // Desktop aside: the last few sends/receives. Both reads are enhancements — the page renders
  // its three actions regardless.
  const wallets = await serverApi('/wallets').then(async (r) => (r.ok ? ((await r.json()) as Wallet[]) : [])).catch(() => [] as Wallet[]);
  const primary = wallets[0];
  const transfers = primary
    ? await serverApi(`/wallets/${primary.id}/transactions`)
        .then(async (r) => (r.ok ? ((await r.json()) as Transaction[]) : []))
        .then((rows) => rows.filter((t) => TRANSFERS.has(t.type)))
        .catch(() => [] as Transaction[])
    : [];
  return (
    <WithAside
      aside={
        primary ? (
          <ActivityCard
            title="Recent transfers"
            transactions={transfers}
            currency={primary.currency}
            limit={5}
            seeAllHref="/activity"
            empty={{ title: 'No transfers yet', description: 'Send money to someone by their @handle.' }}
          />
        ) : undefined
      }
    >
      <div className="space-y-6">
        <PageHeader title="Pay" description="Send, receive or scan — transfers land instantly." />
        <div className="grid gap-3">
          {actions.map(({ href, label, hint, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-16 items-center gap-4 rounded-2xl border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
            >
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
      </div>
    </WithAside>
  );
}
