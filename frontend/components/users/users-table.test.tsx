import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UsersTable, type StaffUser } from './users-table';

const users: StaffUser[] = [
  { id: 'u1', email: 'jane@wallet.local', firstName: 'Jane', lastName: 'Doe', status: 'active', role: { id: 'r1', name: 'finance' } },
];

describe('UsersTable', () => {
  it('renders a user row with email, name, role, and status', () => {
    render(<UsersTable users={users} />);
    expect(screen.getByText('jane@wallet.local')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('finance')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('shows an empty state when there are no users', () => {
    render(<UsersTable users={[]} />);
    expect(screen.getByText(/no users/i)).toBeInTheDocument();
  });
});
