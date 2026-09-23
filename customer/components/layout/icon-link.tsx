import type { ComponentProps } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// A round icon-only link for a card's corner (the reference's header buttons). The label is the
// accessible name and the tooltip; the icon is decorative.
export function IconLink({ label, icon: Icon, className, ...props }: Omit<ComponentProps<typeof Link>, 'children'> & { label: string; icon: LucideIcon }) {
  return (
    <Link aria-label={label} title={label} className={cn('flex size-8 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-accent active:scale-95', className)} {...props}>
      <Icon className="size-4" aria-hidden />
    </Link>
  );
}
