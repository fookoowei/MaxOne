import { formatChangePct } from '@/lib/format/price';
import { cn } from '@/lib/utils';

// A signed percentage change in the money-state colour for its direction. Size, layout and figure
// style come from the caller; only the number, an optional suffix and the colour live here.
export function ChangeText({ pct, suffix, className }: { pct: number; suffix?: string; className?: string }) {
  return (
    <span className={cn(pct >= 0 ? 'text-status-approved' : 'text-status-rejected', className)}>
      {formatChangePct(pct)}
      {suffix}
    </span>
  );
}
