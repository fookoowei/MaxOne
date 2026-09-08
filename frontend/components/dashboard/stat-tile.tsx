import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// One verdict per tile: the number in the largest type, a plain label, one line of context.
export function StatTile({ label, value, hint, tone = 'neutral' }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'neutral' | 'pending' | 'approved' | 'rejected' }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tracking-tight tabular', tone === 'pending' && 'text-status-pending', tone === 'rejected' && 'text-status-rejected', tone === 'approved' && 'text-status-approved')}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
