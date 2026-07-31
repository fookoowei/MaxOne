import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WalletsTable, type StaffWallet } from './wallets-table';

const wallets: StaffWallet[] = [
  { id: 'w1', name: 'Main', currency: 'USD', balance: 15000, createdAt: '2026-07-31T00:00:00.000Z', user: { email: 'jane@wallet.local' } },
];

describe('WalletsTable', () => {
  it('renders a wallet row linking to its detail page', () => {
    render(<WalletsTable wallets={wallets} />);
    expect(screen.getByText('Main')).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
    expect(screen.getByText('jane@wallet.local')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /main/i });
    expect(link).toHaveAttribute('href', '/wallets/w1');
  });

  it('shows an empty state when there are no wallets', () => {
    render(<WalletsTable wallets={[]} />);
    expect(screen.getByText(/no wallets/i)).toBeInTheDocument();
  });
});
