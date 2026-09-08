'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useTransition } from 'react';
import { parseTableParams, tableHref, type TableConfig, type TablePatch, type TableParams } from '@/lib/table/params';

/**
 * The client half of URL-driven tables: read the current params, write the next href. The write
 * runs inside a transition so the table can dim (`pending`) while the Server Component re-renders
 * with the new page — no client fetching, no spinner overlay, the back button just works.
 */
export function useTableParams(cfg: TableConfig): { params: TableParams; set: (patch: TablePatch) => void; pending: boolean } {
  const sp = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const params = useMemo(() => parseTableParams(Object.fromEntries(sp.entries()), cfg), [sp, cfg]);
  const set = useCallback(
    (patch: TablePatch) => {
      const href = tableHref(pathname, params, patch, cfg);
      startTransition(() => router.replace(href, { scroll: false }));
    },
    [pathname, params, cfg, router],
  );
  return { params, set, pending };
}
