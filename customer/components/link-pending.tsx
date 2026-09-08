'use client';

import { useLinkStatus } from 'next/link';
import { Spinner } from '@/components/ui/spinner';

// Rendered INSIDE a <Link>: shows a small spinner while that navigation is in flight, so a click on
// a nav item answers immediately even when the next page's data takes a moment.
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner size="sm" label="Loading page" className={className} /> : null;
}
