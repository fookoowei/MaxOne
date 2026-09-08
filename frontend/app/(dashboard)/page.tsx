import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { roleHasPermission } from '@/lib/auth/permissions';
import { serverApi } from '@/lib/api/server';
import { relativeTime } from '@/lib/format/relative-time';
import { PageHeader } from '@/components/page-header';
import { MoneyText } from '@/components/money-text';
import { StatTile } from '@/components/dashboard/stat-tile';
import { NeedsDecision } from '@/components/dashboard/needs-decision';
import { SystemCard, type HealthReport } from '@/components/dashboard/system-card';
import type { PendingTransaction } from '@/components/approvals/approvals-table';

interface Overview {
  pending: { count: number; oldestCreatedAt: string | null; byType: Record<'deposit' | 'withdrawal', { count: number; amount: number }> };
  today: { approved: number; rejected: number };
  oldestPending: PendingTransaction[];
}

// Exception-first: what needs a decision, how much money is in flight, what got decided today,
// and (for admins) whether the machinery underneath is healthy. No chart wall.
export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const canSeeQueue = roleHasPermission(user.role, 'transaction.view_all');
  const canSeeSystem = user.role === 'super_admin' || user.role === 'admin';

  const [overview, health] = await Promise.all([
    canSeeQueue ? serverApi('/admin/overview').then(async (r) => (r.ok ? ((await r.json()) as Overview) : null)).catch(() => null) : null,
    canSeeSystem ? serverApi('/health').then(async (r) => ((await r.json()) as HealthReport)).catch(() => null) : null,
  ]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (!canSeeQueue) {
    return <PageHeader title={`${greeting}`} description="Your role has no back-office queues. Use the navigation on the left for what you can access." />;
  }

  const p = overview?.pending;
  const inFlight = p ? p.byType.deposit.amount + p.byType.withdrawal.amount : 0;
  return (
    <div className="space-y-6">
      <PageHeader title={greeting} description={p && p.count > 0 ? `${p.count} request${p.count === 1 ? '' : 's'} waiting for a decision.` : 'The queue is clear.'} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Pending approvals" value={p?.count ?? '—'} tone={p && p.count > 0 ? 'pending' : 'neutral'} hint={p?.oldestCreatedAt ? `Oldest has waited ${relativeTime(p.oldestCreatedAt).replace(' ago', '')}` : 'Nothing waiting'} />
        <StatTile
          label="Money in flight"
          value={p ? <MoneyText amountMinor={inFlight} currency="USD" /> : '—'}
          hint={p ? `${p.byType.deposit.count} deposit${p.byType.deposit.count === 1 ? '' : 's'} · ${p.byType.withdrawal.count} withdrawal${p.byType.withdrawal.count === 1 ? '' : 's'}` : undefined}
        />
        <StatTile label="Decided today" value={overview ? overview.today.approved + overview.today.rejected : '—'} hint={overview ? `${overview.today.approved} approved · ${overview.today.rejected} rejected` : undefined} />
      </div>

      <div className={canSeeSystem ? 'grid gap-4 lg:grid-cols-[2fr_1fr]' : ''}>
        <NeedsDecision rows={overview?.oldestPending ?? []} total={p?.count ?? 0} role={user.role} />
        {canSeeSystem && <SystemCard health={health} />}
      </div>
    </div>
  );
}
