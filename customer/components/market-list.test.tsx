import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarketList } from './market-list';

const assets = [
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' as const, price: 43000, change24h: 2.34 },
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' as const, price: 189.5, change24h: -1.1 },
];

describe('MarketList', () => {
  it('renders name, symbol, price, and colored 24h change', () => {
    render(<MarketList assets={assets} />);
    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('$43,000.00')).toBeInTheDocument();
    expect(screen.getByText('+2.34%')).toBeInTheDocument();
    expect(screen.getByText('-1.10%')).toBeInTheDocument();
  });

  it('shows an empty state when there are no assets', () => {
    render(<MarketList assets={[]} />);
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
  });
});
