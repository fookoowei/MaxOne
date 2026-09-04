import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './login-form';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const loginWithPasskey = vi.fn();
vi.mock('@/lib/passkeys/client', () => ({ loginWithPasskey: () => loginWithPasskey() }));

beforeEach(() => {
  push.mockReset();
  vi.restoreAllMocks();
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('LoginForm 2FA step', () => {
  it('swaps to a code step on requires2fa, then completes login at /api/auth/login/2fa', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(json({ requires2fa: true, challengeToken: 'chal-1' }))
      .mockResolvedValueOnce(json({ user: { id: 'u1' } }));
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'Password123');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    // No redirect yet — the code step appears instead.
    const codeInput = await screen.findByLabelText(/authentication code/i);
    expect(push).not.toHaveBeenCalled();

    await userEvent.type(codeInput, '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    expect(String(fetchSpy.mock.calls[1][0])).toBe('/api/auth/login/2fa');
    expect(JSON.parse((fetchSpy.mock.calls[1][1] as RequestInit).body as string)).toEqual({
      challengeToken: 'chal-1',
      code: '123456',
    });
  });

  it('signs in with a passkey (no password) and redirects', async () => {
    loginWithPasskey.mockResolvedValue(true);
    render(<LoginForm />);
    await userEvent.click(screen.getByRole('button', { name: /sign in with passkey/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
  });
});
