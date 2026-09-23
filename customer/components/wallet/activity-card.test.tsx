import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivityCard } from './activity-card';

const tx = (over: Partial<{ id: string; type: string; amount: number; status: string; note: string | null }>) => ({
  id: 't', type: 'deposit', amount: 25000, status: 'approved', note: null, createdAt: new Date().toISOString(), ...over,
});

describe('ActivityCard', () => {
  it('signs amounts by direction and turns a pending amount orange with a pill', () => {
    render(<ActivityCard transactions={[tx({ id: 'a' }), tx({ id: 'b', type: 'transfer_out', amount: 4000 }), tx({ id: 'c', status: 'pending', amount: 120000 })]} currency="USD" />);
    expect(screen.getByText((_, n) => n?.tagName === 'SPAN' && n.textContent === '+$250.00')).toHaveClass('text-status-approved');
    expect(screen.getByText((_, n) => n?.tagName === 'SPAN' && n.textContent === '−$40.00')).toBeInTheDocument();
    expect(screen.getByText('Pending review')).toBeInTheDocument();
    expect(screen.getByText((_, n) => n?.tagName === 'SPAN' && n.textContent === '$1,200.00')).toHaveClass('text-status-pending');
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
  it('a filtered card can say its own empty hint', () => {
    render(<ActivityCard transactions={[]} currency="USD" title="Recent transfers" empty={{ title: 'No transfers yet', description: 'Send money to someone.' }} />);
    expect(screen.getByText('No transfers yet')).toBeInTheDocument();
    expect(screen.getByText('Send money to someone.')).toBeInTheDocument();
  });
});

describe('ActivityCard (grouped)', () => {
  it('files rows under Today / Yesterday like a statement', () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86_400_000);
    const rows = [
      { id: 'a', type: 'deposit', amount: 1000, status: 'approved', note: null, createdAt: today.toISOString() },
      { id: 'b', type: 'withdrawal', amount: 500, status: 'approved', note: null, createdAt: yesterday.toISOString() },
    ];
    render(<ActivityCard transactions={rows} currency="USD" grouped />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
  });
});
