import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// One section of a page rising into place; `i` is its position in the stagger (70ms apart).
// Server-safe: the choreography is pure CSS (see the motion vocabulary in globals.css).
export function Enter({ i = 0, className, children }: { i?: number; className?: string; children: ReactNode }) {
  return (
    <div className={cn('enter-up', className)} style={{ '--i': i } as CSSProperties}>
      {children}
    </div>
  );
}
