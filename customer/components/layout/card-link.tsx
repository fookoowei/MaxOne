import type { ComponentProps } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// The small corner link on a card ("Open", "See all"): one look everywhere, with a chevron so
// it reads as a way forward and not as a label. Accessible name is the text alone.
export function CardLink({ className, children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link className={cn('inline-flex min-h-8 items-center gap-0.5 text-[13px] font-medium text-primary hover:underline', className)} {...props}>
      {children}
      <ChevronRight className="size-3.5" aria-hidden />
    </Link>
  );
}
