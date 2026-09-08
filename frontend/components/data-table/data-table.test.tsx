import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const replace = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => '/wallets',
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

import { DataTable, DataTablePagination, DataTableToolbar } from './index';

const cfg = { sortFields: ['balance', 'name'], defaultSort: 'name:asc', filterKeys: ['currency'] };
const rows = [{ id: '1', name: 'Main', balance: 100 }, { id: '2', name: 'Savings', balance: 50 }];
const columns = [
  { key: 'name', header: 'Wallet', sortField: 'name', cell: (r: (typeof rows)[0]) => r.name },
  { key: 'balance', header: 'Balance', sortField: 'balance', align: 'right' as const, cell: (r: (typeof rows)[0]) => String(r.balance) },
];

beforeEach(() => {
  replace.mockClear();
  search = '';
});

describe('DataTable', () => {
  it('renders rows; a sortable header writes the next sort to the URL', async () => {
    render(<DataTable columns={columns} rows={rows} getRowId={(r) => r.id} cfg={cfg} emptyState={<p>empty</p>} />);
    expect(screen.getByText('Savings')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /balance/i }));
    expect(replace).toHaveBeenCalledWith('/wallets?sort=balance%3Aasc', { scroll: false });
  });
  it('clicking the active ascending sort flips it to descending', async () => {
    search = 'sort=balance:asc';
    render(<DataTable columns={columns} rows={rows} getRowId={(r) => r.id} cfg={cfg} emptyState={<p>empty</p>} />);
    expect(screen.getByRole('columnheader', { name: /balance/i })).toHaveAttribute('aria-sort', 'ascending');
    await userEvent.click(screen.getByRole('button', { name: /balance/i }));
    expect(replace).toHaveBeenCalledWith('/wallets?sort=balance%3Adesc', { scroll: false });
  });
  it('shows the empty state when there are no rows', () => {
    render(<DataTable columns={columns} rows={[]} getRowId={(r) => r.id} cfg={cfg} emptyState={<p>Nothing here</p>} />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});

describe('DataTableToolbar', () => {
  it('shows applied filters as chips; removing one and clearing all write to the URL', async () => {
    search = 'q=jane&currency=USD';
    render(<DataTableToolbar cfg={cfg} searchPlaceholder="Search" filters={[{ key: 'currency', label: 'Currency', options: [{ value: 'USD', label: 'USD' }] }]} />);
    expect(screen.getByText('“jane”')).toBeInTheDocument();
    expect(screen.getByText('Currency: USD')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Currency: USD' }));
    expect(replace).toHaveBeenLastCalledWith('/wallets?q=jane', { scroll: false });
    await userEvent.click(screen.getByRole('button', { name: /clear all/i }));
    expect(replace).toHaveBeenLastCalledWith('/wallets', { scroll: false });
  });
  it('typing in search is debounced into the URL and resets the page', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    search = 'page=3';
    render(<DataTableToolbar cfg={cfg} searchPlaceholder="Search" />);
    await userEvent.type(screen.getByLabelText('Search'), 'bob');
    await vi.advanceTimersByTimeAsync(350);
    expect(replace).toHaveBeenLastCalledWith('/wallets?q=bob', { scroll: false });
    vi.useRealTimers();
  });
});

describe('DataTablePagination', () => {
  it('shows the range and moves pages', async () => {
    search = 'page=2';
    render(<DataTablePagination cfg={cfg} total={143} />);
    expect(screen.getByText('21–40 of 143')).toBeInTheDocument();
    expect(screen.getByText('2 / 8')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(replace).toHaveBeenCalledWith('/wallets?page=3', { scroll: false });
  });
  it('disables Previous on page 1 and Next on the last page', () => {
    search = 'page=8';
    render(<DataTablePagination cfg={cfg} total={143} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });
});
