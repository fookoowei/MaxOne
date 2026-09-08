'use client';

import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { TableConfig } from '@/lib/table/params';
import { useTableParams } from './use-table-params';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  sortField?: string; // present = sortable by this API field
  className?: string;
}

// Columns → shadcn Table. Sorting is a URL change (the server sorts); numeric columns are right-
// aligned and tabular; the whole table dims while a new page is on its way.
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  cfg,
  emptyState,
  caption,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  cfg: TableConfig;
  emptyState: ReactNode;
  caption?: string;
}) {
  const { params, set, pending } = useTableParams(cfg);
  const [sortField, sortDir] = params.sort.split(':');

  if (rows.length === 0 && !pending) return <>{emptyState}</>;

  return (
    <div className={cn('overflow-x-auto rounded-lg border bg-card transition-opacity', pending && 'opacity-60')} aria-busy={pending || undefined}>
      <Table>
        {caption && <caption className="sr-only">{caption}</caption>}
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {columns.map((c) => {
              const active = c.sortField && c.sortField === sortField;
              const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
              return (
                <TableHead key={c.key} className={cn(c.align === 'right' && 'text-right', c.className)} aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.sortField ? (
                    <button
                      type="button"
                      className={cn('inline-flex items-center gap-1 rounded-sm font-medium hover:text-foreground', active ? 'text-foreground' : 'text-muted-foreground', c.align === 'right' && 'flex-row-reverse')}
                      onClick={() => set({ sort: `${c.sortField}:${active && sortDir === 'asc' ? 'desc' : 'asc'}` })}
                    >
                      {c.header}
                      <Icon className="size-3.5" aria-hidden />
                    </button>
                  ) : (
                    c.header
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={getRowId(row)}>
              {columns.map((c) => (
                <TableCell key={c.key} className={cn(c.align === 'right' && 'text-right tabular', c.className)}>
                  {c.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
