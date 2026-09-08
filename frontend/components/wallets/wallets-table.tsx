'use client';

import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { MoneyText } from '@/components/money-text';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTablePagination, DataTableToolbar, type Column } from '@/components/data-table';
import type { TableConfig } from '@/lib/table/params';

export interface StaffWallet {
  id: string;
  name: string;
  currency: string;
  balance: number;
  createdAt: string;
  user: { email: string };
}

// Mirrors ListWalletsQueryDto on the API.
export const WALLETS_TABLE: TableConfig = { sortFields: ['balance', 'createdAt', 'name'], defaultSort: 'createdAt:asc', filterKeys: ['currency'] };
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY'];

const columns: Column<StaffWallet>[] = [
  { key: 'name', header: 'Wallet', sortField: 'name', cell: (w) => <Link href={`/wallets/${w.id}`} className="font-medium text-primary underline-offset-4 hover:underline">{w.name}</Link> },
  { key: 'owner', header: 'Owner', cell: (w) => <span className="text-muted-foreground">{w.user.email}</span> },
  { key: 'currency', header: 'Currency', cell: (w) => <Badge variant="outline">{w.currency}</Badge> },
  { key: 'balance', header: 'Balance', align: 'right', sortField: 'balance', cell: (w) => <MoneyText amountMinor={w.balance} currency={w.currency} /> },
  { key: 'created', header: 'Created', sortField: 'createdAt', cell: (w) => <span className="text-muted-foreground">{new Date(w.createdAt).toLocaleDateString()}</span> },
];

export function WalletsTable({ wallets, total }: { wallets: StaffWallet[]; total: number }) {
  return (
    <div className="space-y-3">
      <DataTableToolbar cfg={WALLETS_TABLE} searchPlaceholder="Search wallets or owners" filters={[{ key: 'currency', label: 'Currency', options: CURRENCIES.map((c) => ({ value: c, label: c })) }]} />
      <DataTable columns={columns} rows={wallets} getRowId={(w) => w.id} cfg={WALLETS_TABLE} caption="Wallets" emptyState={<EmptyState icon={Wallet} title="No wallets match" description="Try a different name, owner email or currency." />} />
      <DataTablePagination cfg={WALLETS_TABLE} total={total} />
    </div>
  );
}
