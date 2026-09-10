import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarketsTicker } from './markets-ticker';

const rows = ['bitcoin', 'ethereum', 'solana', 'cardano', 'dogecoin'].map((id, i) => ({
  id,
  symbol: id.slice(0, 3).toUpperCase(),
  name: id[0].toUpperCase() + id.slice(1),
  price: 1000 * (i + 1),
  change24h: i === 0 ? 2.34 : -1.1,
}));

describe('MarketsTicker', () => {
  it('renders at most four rows, each linking to the asset page', () => {
    render(<MarketsTicker assets={rows} />);
    expect(screen.getAllByRole('link')).toHaveLength(4);
    expect(screen.getByRole('link', { name: /bitcoin/i })).toHaveAttribute('href', '/markets/bitcoin');
    expect(screen.getByText('+2.34%')).toBeInTheDocument();
  });

  it('renders nothing when the catalog is empty', () => {
    const { container } = render(<MarketsTicker assets={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
