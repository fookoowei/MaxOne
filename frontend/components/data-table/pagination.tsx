'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PAGE_SIZES, pageLabel, type TableConfig } from '@/lib/table/params';
import { useTableParams } from './use-table-params';

export function DataTablePagination({ cfg, total }: { cfg: TableConfig; total: number }) {
  const { params, set } = useTableParams(cfg);
  const pages = Math.max(1, Math.ceil(total / params.size));
  const sizes = Object.fromEntries(PAGE_SIZES.map((n) => [String(n), `${n} per page`]));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span className="tabular">{pageLabel(params, total)}</span>
      <div className="flex items-center gap-2">
        <Select value={String(params.size)} onValueChange={(v) => set({ size: Number(v) })} items={sizes}>
          <SelectTrigger aria-label="Rows per page" size="sm" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} per page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={params.page <= 1} onClick={() => set({ page: params.page - 1 })}>
          <ChevronLeft aria-hidden />
        </Button>
        <span className="tabular">
          {params.page} / {pages}
        </span>
        <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={params.page >= pages} onClick={() => set({ page: params.page + 1 })}>
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </div>
  );
}
