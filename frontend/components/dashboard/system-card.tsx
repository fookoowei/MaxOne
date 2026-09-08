import { cn } from '@/lib/utils';

export interface HealthReport {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  redis: 'up' | 'down';
  rabbitmq: 'up' | 'down';
  outboxPending: number | null;
  deadLetters: number | null;
}

// The M16/M17 numbers, for the people who can act on them. A dot per dependency; the two counters
// that mean "something is silently broken" turn amber/red only when they are non-zero.
export function SystemCard({ health }: { health: HealthReport | null }) {
  const deps: { label: string; up: boolean | null }[] = health
    ? [
        { label: 'Postgres', up: health.db === 'up' },
        { label: 'Redis', up: health.redis === 'up' },
        { label: 'RabbitMQ', up: health.rabbitmq === 'up' },
      ]
    : [];
  return (
    <section className="rounded-lg border bg-card">
      <header className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">System</h2>
      </header>
      {!health ? (
        <p className="p-4 text-sm text-muted-foreground">Health check unavailable.</p>
      ) : (
        <dl className="grid gap-3 p-4 text-sm">
          {deps.map((d) => (
            <div key={d.label} className="flex items-center justify-between">
              <dt className="text-muted-foreground">{d.label}</dt>
              <dd className="flex items-center gap-2">
                <span aria-hidden className={cn('size-2 rounded-full', d.up ? 'bg-status-approved' : 'bg-status-rejected')} />
                {d.up ? 'Up' : 'Down'}
              </dd>
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-3">
            <dt className="text-muted-foreground">Notifications waiting to send</dt>
            <dd className={cn('tabular', (health.outboxPending ?? 0) > 0 && 'text-status-pending')}>{health.outboxPending ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Failed notifications (dead letters)</dt>
            <dd className={cn('tabular', (health.deadLetters ?? 0) > 0 && 'text-status-rejected')}>{health.deadLetters ?? '—'}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
