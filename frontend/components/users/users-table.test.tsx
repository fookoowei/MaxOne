import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UsersTable, type StaffUser } from './users-table';

// UsersTable now renders UserRowActions, which calls useRouter().
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const roles = [{ id: 'r1', name: 'finance' }];
const users: StaffUser[] = [
  { id: 'u1', email: 'jane@wallet.local', firstName: 'Jane', lastName: 'Doe', status: 'active', role: { id: 'r1', name: 'finance' } },
];

describe('UsersTable', () => {
  it('renders a user row with email, name, role, and status', () => {
    render(<UsersTable users={users} roles={roles} currentUserId="admin" currentUserRole="super_admin" />);
    expect(screen.getByText('jane@wallet.local')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    // role appears both in the Role column and the action dropdown option
    expect(screen.getAllByText('finance').length).toBeGreaterThan(0);
  });

  it('shows an empty state when there are no users', () => {
    render(<UsersTable users={[]} roles={roles} currentUserId="admin" currentUserRole="super_admin" />);
    expect(screen.getByText(/no users/i)).toBeInTheDocument();
  });
});
