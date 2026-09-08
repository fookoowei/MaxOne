import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Colour = state. pending is amber (money in flight — "design the pending state"), approved is the
// ledger accent, rejected is red; anything else is quiet.
const TONE: Record<string, string> = {
  pending: 'bg-status-pending/12 text-status-pending',
  approved: 'bg-status-approved/12 text-status-approved',
  rejected: 'bg-status-rejected/12 text-status-rejected',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = TONE[status];
  return (
    <Badge variant={tone ? 'outline' : 'secondary'} className={cn('border-transparent capitalize', tone, className)}>
      {status}
    </Badge>
  );
}
