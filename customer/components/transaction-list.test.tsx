import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransactionList } from './transaction-list';

const txns = [
  { id: 't1', type: 'deposit', amount: 5000, status: 'completed', note: 'Top up', createdAt: '2026-08-20T10:00:00Z' },
  { id: 't2', type: 'withdrawal', amount: 2000, status: 'pending', note: null, createdAt: '2026-08-21T10:00:00Z' },
];

describe('TransactionList', () => {
  it('renders a signed, formatted amount per transaction', () => {
    render(<TransactionList transactions={txns} currency="USD" />);
    expect(screen.getByText('+$50.00')).toBeInTheDocument();
    expect(screen.getByText('-$20.00')).toBeInTheDocument();
  });

  it('shows an empty state when there are no transactions', () => {
    render(<TransactionList transactions={[]} currency="USD" />);
    expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument();
  });
});
