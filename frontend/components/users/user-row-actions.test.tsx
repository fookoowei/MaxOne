import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { UserRowActions } from './user-row-actions';

const roles = [{ id: 'r1', name: 'support' }, { id: 'r2', name: 'finance' }, { id: 'r3', name: 'super_admin' }];
const user = { id: 'u1', email: 'jane@wallet.local', firstName: 'Jane', lastName: 'Doe', status: 'active' as const, role: { id: 'r1', name: 'support' } };
beforeEach(() => vi.clearAllMocks());

describe('UserRowActions (confirm first)', () => {
  it('disables both controls on your own row', () => {
    render(<UserRowActions user={user} roles={roles} currentUserId="u1" currentUserRole="super_admin" />);
    expect(screen.getByRole('button', { name: 'Suspend' })).toBeDisabled();
    const cb = screen.getByRole('combobox', { name: /role for/i });
    expect(cb.hasAttribute('disabled') || cb.getAttribute('aria-disabled') === 'true' || cb.hasAttribute('data-disabled')).toBe(true);
  });

  it('Suspend asks first, then PATCHes status and refreshes', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    render(<UserRowActions user={user} roles={roles} currentUserId="me" currentUserRole="admin" />);
    await userEvent.click(screen.getByRole('button', { name: 'Suspend' }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent(/suspend jane@wallet.local\?/i);
    expect(fetchSpy).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Suspend user' }));
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/users/u1/status');
    expect(JSON.parse(init.body as string)).toEqual({ status: 'suspended' });
    await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('hides the super_admin role unless the actor is a super_admin', async () => {
    render(<UserRowActions user={user} roles={roles} currentUserId="me" currentUserRole="admin" />);
    await userEvent.click(screen.getByRole('combobox', { name: /role for/i }));
    expect(await screen.findByRole('option', { name: 'finance' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /super admin/i })).toBeNull();
  });
});
