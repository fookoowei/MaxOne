import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PillTone = 'pending' | 'approved' | 'rejected' | 'neutral';

// The small state pill on a row ("Pending review", "Reached", "On"). Colour = state, from the
// money-state tokens; neutral is quiet. One shape everywhere: 20px tall, full radius, 12px text.
const TONE: Record<PillTone, string> = {
  pending: 'bg-status-pending/12 text-status-pending',
  approved: 'bg-status-approved/12 text-status-approved',
  rejected: 'bg-status-rejected/12 text-status-rejected',
  neutral: 'bg-muted text-muted-foreground',
};

export function StatusPill({ tone = 'neutral', className, children }: { tone?: PillTone; className?: string; children: ReactNode }) {
  return <span className={cn('inline-flex h-5 items-center rounded-full px-2 text-xs font-medium', TONE[tone], className)}>{children}</span>;
}
