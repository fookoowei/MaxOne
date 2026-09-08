'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TableConfig } from '@/lib/table/params';
import { useTableParams } from './use-table-params';

export interface FilterDef {
  key: string;
  label: string; // "Currency"
  allLabel?: string; // "All currencies" — pass it; English plurals are not `label + 's'`
  options: { value: string; label: string }[];
}
const allLabel = (f: FilterDef) => f.allLabel ?? `All ${f.label.toLowerCase()}s`;

const ALL = '__all__';

// Search + up to a few filters above the table, applied filters as removable chips, clear-all.
// Everything writes to the URL; the Server Component does the actual filtering.
export function DataTableToolbar({ cfg, searchPlaceholder, filters = [] }: { cfg: TableConfig; searchPlaceholder: string; filters?: FilterDef[] }) {
  const { params, set } = useTableParams(cfg);
  const [q, setQ] = useState(params.q);
  useEffect(() => setQ(params.q), [params.q]);
  useEffect(() => {
    if (q === params.q) return;
    const t = setTimeout(() => set({ q }), 300);
    return () => clearTimeout(t);
  }, [q, params.q, set]);

  const applied = [
    ...(params.q ? [{ key: 'q', text: `“${params.q}”`, clear: () => set({ q: '' }) }] : []),
    ...filters
      .filter((f) => params.filters[f.key])
      .map((f) => ({
        key: f.key,
        text: `${f.label}: ${f.options.find((o) => o.value === params.filters[f.key])?.label ?? params.filters[f.key]}`,
        clear: () => set({ filters: { [f.key]: undefined } }),
      })),
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label={searchPlaceholder} placeholder={searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        {filters.map((f) => (
          <Select
            key={f.key}
            value={params.filters[f.key] ?? ALL}
            onValueChange={(v) => set({ filters: { [f.key]: v === ALL || v == null ? undefined : String(v) } })}
            items={{ [ALL]: allLabel(f), ...Object.fromEntries(f.options.map((o) => [o.value, o.label])) }}
          >
            <SelectTrigger aria-label={f.label} className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{allLabel(f)}</SelectItem>
              {f.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>
      {applied.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Applied filters">
          {applied.map((a) => (
            <Badge key={a.key} variant="secondary" className="gap-1 pr-1">
              {a.text}
              <button type="button" aria-label={`Remove ${a.text}`} onClick={a.clear} className="rounded-full p-0.5 hover:bg-foreground/10">
                <X className="size-3" aria-hidden />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="xs" onClick={() => set({ q: '', filters: Object.fromEntries(cfg.filterKeys.map((k) => [k, undefined])) })}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
