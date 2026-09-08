'use client';

import { ScrollText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EmptyState } from '@/components/empty-state';
import { RelativeTime } from '@/components/relative-time';
import { DataTablePagination, DataTableToolbar, useTableParams } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import type { TableConfig } from '@/lib/table/params';
import { cn } from '@/lib/utils';
import { DiffList } from './diff-list';

export interface AuditEntry {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// Mirrors AuditQueryDto: no sort (always newest first), filters + free text + date range.
export const AUDIT_TABLE: TableConfig = { sortFields: [], defaultSort: 'createdAt:desc', filterKeys: ['entityType', 'action', 'actorId', 'from', 'to'] };
export const AUDIT_ACTIONS = ['deposit.approve', 'deposit.reject', 'withdrawal.approve', 'withdrawal.reject', 'wallet.adjust', 'wallet.transfer', 'user.status_change', 'user.role_change'];

const ACTION_TONE: Record<string, string> = {
  approve: 'bg-status-approved/12 text-status-approved',
  reject: 'bg-status-rejected/12 text-status-rejected',
  adjust: 'bg-status-pending/12 text-status-pending',
};

function ActionBadge({ action }: { action: string }) {
  const verb = action.split('.')[1] ?? action;
  const tone = Object.entries(ACTION_TONE).find(([k]) => verb.startsWith(k))?.[1] ?? 'bg-secondary text-secondary-foreground';
  return <Badge variant="outline" className={cn('border-transparent font-medium', tone)}>{action.replace('_', ' ')}</Badge>;
}

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

function DateRange() {
  const { params, set } = useTableParams(AUDIT_TABLE);
  const presets = [
    { label: 'Today', from: iso(new Date()) },
    { label: '7 days', from: iso(new Date(Date.now() - 7 * DAY)) },
    { label: '30 days', from: iso(new Date(Date.now() - 30 * DAY)) },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label className="flex items-center gap-1.5 text-muted-foreground">
        From
        <input type="date" aria-label="From date" value={params.filters.from ?? ''} onChange={(e) => set({ filters: { from: e.target.value || undefined } })} className="h-8 rounded-lg border bg-transparent px-2 text-foreground" />
      </label>
      <label className="flex items-center gap-1.5 text-muted-foreground">
        To
        <input type="date" aria-label="To date" value={params.filters.to ?? ''} onChange={(e) => set({ filters: { to: e.target.value || undefined } })} className="h-8 rounded-lg border bg-transparent px-2 text-foreground" />
      </label>
      <div className="flex gap-1" role="group" aria-label="Date presets">
        {presets.map((p) => (
          <Button key={p.label} size="xs" variant={params.filters.from === p.from && !params.filters.to ? 'secondary' : 'ghost'} onClick={() => set({ filters: { from: p.from, to: undefined } })}>
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function AuditTable({ entries, total }: { entries: AuditEntry[]; total: number }) {
  return (
    <div className="space-y-3">
      <DataTableToolbar
        cfg={AUDIT_TABLE}
        searchPlaceholder="Search action or entity id"
        filters={[
          { key: 'entityType', label: 'Entity', options: ['transaction', 'wallet', 'user'].map((v) => ({ value: v, label: v })) },
          { key: 'action', label: 'Action', options: AUDIT_ACTIONS.map((a) => ({ value: a, label: a.replace('_', ' ') })) },
        ]}
      />
      <DateRange />
      {entries.length === 0 ? (
        <EmptyState icon={ScrollText} title="No audit entries match" description="Widen the date range or clear a filter." />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id} className="align-top">
                  <TableCell className="whitespace-nowrap">
                    <span className="grid leading-tight">
                      <RelativeTime iso={e.createdAt} />
                      <span className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</span>
                    </span>
                  </TableCell>
                  <TableCell><ActionBadge action={e.action} /></TableCell>
                  <TableCell>
                    <span className="grid leading-tight">
                      <span className="capitalize">{e.entityType}</span>
                      <span className="text-xs text-muted-foreground tabular" title={e.entityId}>{e.entityId.slice(0, 8)}</span>
                    </span>
                  </TableCell>
                  <TableCell className="min-w-64">
                    <DiffList before={e.oldValue} after={e.newValue} />
                    <Collapsible className="mt-1">
                      <CollapsibleTrigger render={<Button variant="link" size="xs" className="h-auto p-0 text-xs text-muted-foreground" />}>Show raw</CollapsibleTrigger>
                      <CollapsibleContent>
                        <pre className="mt-1 max-w-md overflow-x-auto rounded-md bg-muted p-2 text-[11px] leading-snug">{JSON.stringify({ before: e.oldValue, after: e.newValue }, null, 1)}</pre>
                      </CollapsibleContent>
                    </Collapsible>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular" title={e.actorUserId}>{e.actorUserId.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular">{e.ipAddress ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <DataTablePagination cfg={AUDIT_TABLE} total={total} />
    </div>
  );
}
