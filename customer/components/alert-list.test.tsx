import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlertList } from './alert-list';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const rows = [
  { id: 'a1', symbol: 'BTC', targetPrice: 70000, direction: 'above' as const, currentPrice: 78000, triggered: true, triggeredAt: '2026-09-01T00:00:00Z' },
  { id: 'a2', symbol: 'ETH', targetPrice: 5000, direction: 'above' as const, currentPrice: 2400, triggered: false, triggeredAt: null },
];

describe('AlertList', () => {
  it('renders the rule and Reached/Pending state', () => {
    render(<AlertList rows={rows} />);
    expect(screen.getByText(/above \$70,000/i)).toBeInTheDocument();
    expect(screen.getByText(/reached/i)).toBeInTheDocument();
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });
});
