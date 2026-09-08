import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/wallets',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

import { WalletsTable, type StaffWallet } from './wallets-table';

const wallets: StaffWallet[] = [
  { id: 'w1', name: 'Main', currency: 'USD', balance: 15000, createdAt: '2026-07-31T00:00:00.000Z', user: { email: 'jane@wallet.local' } },
];

describe('WalletsTable', () => {
  it('renders a wallet row linking to its detail page, with the balance right-aligned', () => {
    render(<WalletsTable wallets={wallets} total={1} />);
    expect(screen.getByRole('link', { name: 'Main' })).toHaveAttribute('href', '/wallets/w1');
    expect(screen.getByText('jane@wallet.local')).toBeInTheDocument();
    expect(screen.getByText((_, n) => n?.tagName === 'TD' && n.textContent === '$150.00')).toHaveClass('text-right');
    expect(screen.getByText('1–1 of 1')).toBeInTheDocument();
  });
  it('shows an empty state when nothing matches', () => {
    render(<WalletsTable wallets={[]} total={0} />);
    expect(screen.getByText('No wallets match')).toBeInTheDocument();
  });
});
