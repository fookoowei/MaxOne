import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { UserRowActions } from './user-row-actions';
import type { StaffUser } from './users-table';

const roles = [{ id: 'r1', name: 'finance' }, { id: 'r2', name: 'support' }, { id: 'r3', name: 'super_admin' }];
const jane: StaffUser = { id: 'u1', email: 'jane@wallet.local', firstName: 'Jane', lastName: 'Doe', status: 'active', role: { id: 'r1', name: 'finance' } };

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('UserRowActions SoD gating', () => {
  it('disables both controls on your own row', () => {
    render(<UserRowActions user={jane} roles={roles} currentUserId="u1" currentUserRole="super_admin" />);
    expect(screen.getByRole('button', { name: /suspend/i })).toBeDisabled();
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('hides the super_admin option unless the actor is a super_admin', () => {
    render(<UserRowActions user={jane} roles={roles} currentUserId="admin" currentUserRole="admin" />);
    expect(screen.queryByRole('option', { name: 'super_admin' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'finance' })).toBeInTheDocument();
  });
});

describe('UserRowActions behavior', () => {
  it('suspends an active user via the BFF route and refreshes', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    render(<UserRowActions user={jane} roles={roles} currentUserId="admin" currentUserRole="super_admin" />);

    fireEvent.click(screen.getByRole('button', { name: /suspend/i }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const call = fetchMock.mock.calls.find((c) => String(c[0]).endsWith('/status'))!;
    expect(call[1]).toEqual(expect.objectContaining({ method: 'PATCH' }));
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({ status: 'suspended' });
  });

  it('changes role via the BFF route and refreshes', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    render(<UserRowActions user={jane} roles={roles} currentUserId="admin" currentUserRole="super_admin" />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'support' } });

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const call = fetchMock.mock.calls.find((c) => String(c[0]).endsWith('/role'))!;
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({ role: 'support' });
  });
});
