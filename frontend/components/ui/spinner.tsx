import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// One spinner for every wait. `role="status"` + a label so screen readers announce it once;
// motion is reduced to a static icon when the user prefers reduced motion.
export function Spinner({
  size = 'md',
  label = 'Loading',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}) {
  const px = size === 'sm' ? 'size-4' : size === 'lg' ? 'size-8' : 'size-5';
  return (
    <span role="status" aria-label={label} className={cn('inline-flex', className)}>
      <Loader2 aria-hidden className={cn(px, 'animate-spin motion-reduce:animate-none')} />
    </span>
  );
}
