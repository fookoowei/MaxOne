'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { SEGMENT_LABELS } from '@/lib/nav';

// Slim bar above every page: the sidebar toggle and where you are. Page titles live in PageHeader;
// this is orientation, not decoration.
export function PageBar() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const crumbs =
    segments.length === 0
      ? [{ label: 'Dashboard', href: '/' }]
      : segments.map((seg, i) => ({
          label: i === 0 ? (SEGMENT_LABELS[seg] ?? seg) : detailLabel(segments[0]),
          href: '/' + segments.slice(0, i + 1).join('/'),
        }));

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <Fragment key={c.href}>
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {last ? (
                    <BreadcrumbPage>{c.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink render={<Link href={c.href} />}>{c.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}

function detailLabel(section: string): string {
  return { wallets: 'Wallet', users: 'User' }[section] ?? 'Detail';
}
