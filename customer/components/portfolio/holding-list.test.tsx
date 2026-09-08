import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HoldingList } from './holding-list';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const rows = [
  {
    id: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    quantity: 0.5,
    currentPrice: 40000,
    value: 20000,
    invested: 15000,
    pnl: 5000,
    pnlPct: 33.33,
  },
];

describe('HoldingList', () => {
  it('renders value and colored P/L', () => {
    render(<HoldingList rows={rows} />);
    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.getByText('$20,000.00')).toBeInTheDocument();
    expect(screen.getByText(/\+33\.33%/)).toBeInTheDocument();
  });
});
