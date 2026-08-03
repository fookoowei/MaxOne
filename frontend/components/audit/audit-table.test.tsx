import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuditTable, type AuditEntry } from './audit-table';

const entries: AuditEntry[] = [
  {
    id: 'a1', actorUserId: 'admin-uuid', action: 'wallet.adjust', entityType: 'wallet', entityId: 'w1-uuid',
    oldValue: { balance: 10000 }, newValue: { balance: 12500 }, ipAddress: '::1', userAgent: 'node',
    createdAt: '2026-08-02T00:00:00.000Z',
  },
];

describe('AuditTable', () => {
  it('renders an audit entry with action, entity, and before/after', () => {
    render(<AuditTable entries={entries} />);
    expect(screen.getByText('wallet.adjust')).toBeInTheDocument();
    expect(screen.getByText('wallet')).toBeInTheDocument();
    expect(screen.getByText(/"balance":10000/)).toBeInTheDocument();
    expect(screen.getByText(/"balance":12500/)).toBeInTheDocument();
  });

  it('shows an empty state when there are no entries', () => {
    render(<AuditTable entries={[]} />);
    expect(screen.getByText(/no audit entries/i)).toBeInTheDocument();
  });
});
