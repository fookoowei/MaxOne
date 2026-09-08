import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivityCard } from './activity-card';

const tx = (over: Partial<{ id: string; type: string; amount: number; status: string; note: string | null }>) => ({
  id: 't', type: 'deposit', amount: 25000, status: 'approved', note: null, createdAt: new Date().toISOString(), ...over,
});

describe('ActivityCard', () => {
  it('signs amounts by direction and shows a pill instead of a colour while pending', () => {
    render(<ActivityCard transactions={[tx({ id: 'a' }), tx({ id: 'b', type: 'transfer_out', amount: 4000 }), tx({ id: 'c', status: 'pending', amount: 120000 })]} currency="USD" />);
    expect(screen.getByText((_, n) => n?.tagName === 'SPAN' && n.textContent === '+$250.00')).toHaveClass('text-status-approved');
    expect(screen.getByText((_, n) => n?.tagName === 'SPAN' && n.textContent === '−$40.00')).toBeInTheDocument();
    expect(screen.getByText('Pending review')).toBeInTheDocument();
    expect(screen.getByText((_, n) => n?.tagName === 'SPAN' && n.textContent === '$1,200.00')).toHaveClass('text-muted-foreground');
  });
  it('limits rows and offers See all only when there is more', () => {
    const rows = Array.from({ length: 7 }, (_, i) => tx({ id: String(i) }));
    render(<ActivityCard transactions={rows} currency="USD" limit={5} seeAllHref="/activity" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByRole('link', { name: 'See all' })).toHaveAttribute('href', '/activity');
  });
  it('empty state invites the first deposit', () => {
    render(<ActivityCard transactions={[]} currency="USD" />);
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });
});
