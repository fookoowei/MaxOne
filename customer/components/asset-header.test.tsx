import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssetHeader } from './asset-header';

const asset = {
  id: 'bitcoin',
  symbol: 'BTC',
  name: 'Bitcoin',
  type: 'crypto' as const,
  price: 43000,
  change24h: 2.34,
  marketCap: 800000000000,
  high24h: 44000,
  low24h: 42000,
};

describe('AssetHeader', () => {
  it('renders name, price, change, and stats', () => {
    render(<AssetHeader asset={asset} />);
    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.getByText('$43,000.00')).toBeInTheDocument();
    expect(screen.getByText('+2.34% (24h)')).toBeInTheDocument();
    expect(screen.getByText(/44,000/)).toBeInTheDocument(); // 24h high
  });
});
