import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarketList } from './market-list';

// MarketList renders WatchButton (a client component using useRouter) when followedSymbols is set.
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const assets = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', type: 'crypto' as const, price: 43000, change24h: 2.34 },
  { id: 'apple', symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' as const, price: 189.5, change24h: -1.1 },
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

  it('renders a follow button per row when followedSymbols is provided', () => {
    render(<MarketList assets={assets} followedSymbols={['BTC']} />);
    expect(screen.getByRole('button', { name: /unfollow btc/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /follow aapl/i })).toBeInTheDocument();
  });

  it('links each row to the asset detail page', () => {
    render(<MarketList assets={assets} />);
    expect(screen.getByRole('link', { name: /bitcoin/i })).toHaveAttribute('href', '/markets/bitcoin');
  });
});
