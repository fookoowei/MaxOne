import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ApprovalsTable, type PendingTransaction } from './approvals-table';

// ApprovalsTable now renders RowActions, which calls useRouter().
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const rows: PendingTransaction[] = [
  {
    id: 't1',
    type: 'deposit',
    amount: 5000,
    note: null,
    createdAt: '2026-07-30T00:00:00.000Z',
    wallet: { id: 'w1', name: 'Main', currency: 'USD', user: { email: 'jane@wallet.local' } },
  },
];

describe('ApprovalsTable', () => {
  it('renders a row with type, formatted amount, wallet, and owner', () => {
    render(<ApprovalsTable rows={rows} role="finance" />);
    expect(screen.getByText('deposit')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('Main')).toBeInTheDocument();
    expect(screen.getByText('jane@wallet.local')).toBeInTheDocument();
  });

  it('shows an empty state when there are no pending rows', () => {
    render(<ApprovalsTable rows={[]} role="finance" />);
    expect(screen.getByText(/no pending transactions/i)).toBeInTheDocument();
  });
});
