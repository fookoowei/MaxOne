import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

// Every page opens the same way: an optional way back, a title, one line of context, actions.
export function PageHeader({ title, description, back, children }: { title: string; description?: string; back?: { href: string; label: string }; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3">
      {back && (
        <Link href={back.href} className="-ml-1 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-[18px]" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight lg:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </header>
  );
}
