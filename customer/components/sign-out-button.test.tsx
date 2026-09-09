import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
import { SignOutButton } from './sign-out-button';

beforeEach(() => vi.clearAllMocks());

describe('SignOutButton', () => {
  it('POSTs to the logout route, then sends the customer to /login', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    render(<SignOutButton />);

    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));

    expect(fetchSpy).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
    await waitFor(() => expect(push).toHaveBeenCalledWith('/login'));
    expect(refresh).toHaveBeenCalled();
  });
});
