import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/audit',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

import { AuditTable, type AuditEntry } from './audit-table';

const entries: AuditEntry[] = [
  {
    id: 'a1', actorUserId: 'admin-uuid', action: 'wallet.adjust', entityType: 'wallet', entityId: 'w1-uuid-long',
    oldValue: { balance: 10000 }, newValue: { balance: 12500, note: 'correction' }, ipAddress: '::1', userAgent: 'node',
    createdAt: '2026-08-02T00:00:00.000Z',
  },
];

describe('AuditTable', () => {
  it('renders the action, entity, and the change as before → after with money formatted', () => {
    render(<AuditTable entries={entries} total={1} />);
    expect(screen.getByText('wallet.adjust')).toBeInTheDocument();
    expect(screen.getByText('w1-uuid-')).toBeInTheDocument();
    expect(screen.getByText('balance')).toBeInTheDocument();
    expect(screen.getByText('100.00')).toBeInTheDocument();
    expect(screen.getByText('125.00')).toBeInTheDocument();
    expect(screen.getByText('note')).toBeInTheDocument();
    expect(screen.getByText('correction')).toBeInTheDocument();
    expect(screen.queryByText(/"balance":10000/)).toBeNull(); // raw JSON is behind "Show raw"
  });
  it('shows an empty state when there are no entries', () => {
    render(<AuditTable entries={[]} total={0} />);
    expect(screen.getByText(/no audit entries match/i)).toBeInTheDocument();
  });
});
