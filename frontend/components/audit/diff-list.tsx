import { diffSnapshots, formatMinorPlain, humanKey, MONEY_KEYS } from '@/lib/audit-diff';
import { cn } from '@/lib/utils';

function Value({ v, k }: { v: unknown; k: string }) {
  if (v === undefined) return <span className="text-muted-foreground">—</span>;
  if (typeof v === 'number' && MONEY_KEYS.has(k)) return <span className="tabular">{formatMinorPlain(v)}</span>;
  if (v === null) return <span className="text-muted-foreground">null</span>;
  if (typeof v === 'string') return <span>{v}</span>;
  return <code className="text-xs">{JSON.stringify(v)}</code>;
}

// "status: pending → approved", one line per change. The arrow carries the meaning, not colour.
export function DiffList({ before, after }: { before: unknown; after: unknown }) {
  const rows = diffSnapshots(before, after);
  if (rows.length === 0) return <span className="text-muted-foreground">No changes recorded</span>;
  return (
    <dl className="grid gap-0.5 text-sm">
      {rows.map((r) => (
        <div key={r.key} className="flex flex-wrap items-baseline gap-x-2">
          <dt className="text-muted-foreground">{humanKey(r.key)}</dt>
          <dd className={cn('flex items-baseline gap-1.5', r.kind === 'removed' && 'line-through decoration-muted-foreground/60')}>
            <Value v={r.before} k={r.key} />
            <span aria-hidden className="text-muted-foreground">→</span>
            <span className="sr-only">to</span>
            <Value v={r.after} k={r.key} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
