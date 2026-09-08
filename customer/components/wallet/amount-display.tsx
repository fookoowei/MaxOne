'use client';

import { forwardRef, type ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// Money is entered where you can see it: a large figure with the currency symbol lightened.
// A real <input> underneath (label, inputMode, validation) — only the presentation is big.
export const AmountDisplay = forwardRef<HTMLInputElement, ComponentProps<'input'> & { symbol: string; invalid?: boolean }>(function AmountDisplay(
  { symbol, invalid, className, ...props },
  ref,
) {
  return (
    <div className={cn('flex items-baseline gap-1', className)}>
      <span className="text-[28px] font-semibold text-muted-foreground" aria-hidden>
        {symbol}
      </span>
      <input
        ref={ref}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        aria-invalid={invalid || undefined}
        className={cn('w-full min-w-0 bg-transparent text-[44px] leading-[48px] font-bold tracking-tight tabular outline-none placeholder:text-muted-foreground/40', invalid && 'text-destructive')}
        {...props}
      />
    </div>
  );
});
