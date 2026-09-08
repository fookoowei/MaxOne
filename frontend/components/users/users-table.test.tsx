import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/users',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

import { UsersTable, type StaffUser } from './users-table';

const roles = [{ id: 'r1', name: 'finance' }];
const users: StaffUser[] = [
  { id: 'u1', email: 'jane@wallet.local', handle: 'jane', firstName: 'Jane', lastName: 'Doe', status: 'active', role: { id: 'r1', name: 'finance' } },
  { id: 'me', email: 'me@wallet.local', firstName: 'Me', lastName: 'Admin', status: 'active', role: { id: 'r2', name: 'super_admin' } },
];

describe('UsersTable', () => {
  it('renders name, email, handle, role and status; your own row is marked and has no actions', () => {
    render(<UsersTable users={users} total={2} roles={roles} currentUserId="me" currentUserRole="super_admin" />);
    expect(screen.getByText('jane@wallet.local')).toBeInTheDocument();
    expect(screen.getByText('@jane')).toBeInTheDocument();
    expect(screen.getAllByText('finance').length).toBeGreaterThanOrEqual(1); // badge (+ the role select option)
    expect(screen.getAllByText('active')).toHaveLength(2);
    expect(screen.getByText('you')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /suspend/i })).toHaveLength(1);
  });
  it('shows an empty state when there are no users', () => {
    render(<UsersTable users={[]} total={0} roles={roles} currentUserId="me" currentUserRole="admin" />);
    expect(screen.getByText('No users match')).toBeInTheDocument();
  });
});
