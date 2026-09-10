import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PortfolioSummary } from './portfolio-summary';

describe('PortfolioSummary', () => {
  it('shows a gain in green, with the amount and the percentage', () => {
    render(<PortfolioSummary totalValue={12500} totalPnl={2500} totalPnlPct={25} />);
    expect(screen.getByText('$12,500.00')).toBeInTheDocument();
    const pnl = screen.getByText(/\+\$2,500\.00 \(\+25\.00%\)/);
    expect(pnl).toHaveClass('text-status-approved-bright');
  });

  it('shows a loss in red', () => {
    render(<PortfolioSummary totalValue={7500} totalPnl={-2500} totalPnlPct={-25} />);
    expect(screen.getByText(/−?-?\$2,500\.00 \(-25\.00%\)/)).toHaveClass('text-status-rejected-bright');
  });

  it('reads zero when nothing is invested', () => {
    render(<PortfolioSummary totalValue={0} totalPnl={0} totalPnlPct={0} />);
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(screen.getByText(/\+\$0\.00 \(\+0\.00%\)/)).toBeInTheDocument();
  });
});
