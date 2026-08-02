import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransactionHistory, type WalletTransaction } from './transaction-history';

const rows: WalletTransaction[] = [
  { id: 't1', type: 'adjustment', amount: 5000, status: 'approved', note: 'bonus', createdAt: '2026-07-31T00:00:00.000Z', balanceAfter: 20000 },
];

describe('TransactionHistory', () => {
  it('renders a transaction row with formatted amount, status, and running balance', () => {
    render(<TransactionHistory rows={rows} currency="USD" />);
    expect(screen.getByText('adjustment')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('approved')).toBeInTheDocument();
    expect(screen.getByText('$200.00')).toBeInTheDocument();
  });

  it('shows an empty state when there are no transactions', () => {
    render(<TransactionHistory rows={[]} currency="USD" />);
    expect(screen.getByText(/no transactions/i)).toBeInTheDocument();
  });
});
