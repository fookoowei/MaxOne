import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The app's card. Two paddings, one radius:
 *  list    `px-4 pb-1 pt-1` — rows with their own `py-3` sit flush, an optional header row on top
 *  padded  `p-4`            — free-form content
 * `title` + `action` render the standard header row (small semibold title, a CardLink or a note).
 */
export function Panel({
  title,
  action,
  padded = false,
  className,
  children,
  ...props
}: {
  title?: ReactNode;
  action?: ReactNode;
  padded?: boolean;
  className?: string;
  children?: ReactNode;
} & Omit<React.ComponentProps<'section'>, 'title'>) {
  return (
    <section className={cn('rounded-[20px] border bg-card', padded ? 'p-4' : 'px-4 pb-1 pt-1', className)} {...props}>
      {title !== undefined && (
        <div className={cn('flex items-center justify-between', padded ? undefined : 'py-3')}>
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
