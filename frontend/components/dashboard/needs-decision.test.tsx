import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

import { NeedsDecision } from './needs-decision';
import { SystemCard } from './system-card';

const row = { id: 't1', type: 'deposit' as const, amount: 100000, note: null, createdAt: new Date(Date.now() - 3 * 3600e3).toISOString(), wallet: { id: 'w1', name: 'Main', currency: 'USD', user: { email: 'jane@x' } } };

describe('NeedsDecision', () => {
  it('lists the oldest requests with amount, owner, age and actions, and links to the full queue', () => {
    render(<NeedsDecision rows={[row]} total={11} role="finance" />);
    expect(screen.getByText('jane@x', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('3h ago')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view all 11/i })).toHaveAttribute('href', '/approvals');
    expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
  });
  it('is an invitation when the queue is empty', () => {
    render(<NeedsDecision rows={[]} total={0} role="finance" />);
    expect(screen.getByText('Nothing waiting')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('SystemCard', () => {
  it('shows each dependency and colours the two counters only when non-zero', () => {
    render(<SystemCard health={{ status: 'degraded', db: 'up', redis: 'down', rabbitmq: 'up', outboxPending: 0, deadLetters: 2 }} />);
    expect(screen.getAllByText('Up')).toHaveLength(2);
    expect(screen.getByText('Down')).toBeInTheDocument();
    expect(screen.getByText('2')).toHaveClass('text-status-rejected');
    expect(screen.getByText('0')).not.toHaveClass('text-status-pending');
  });
});
