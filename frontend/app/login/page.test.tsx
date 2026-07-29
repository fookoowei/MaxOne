import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Capture router calls so we can assert the post-login redirect.
const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

import LoginPage from './page';

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('LoginPage', () => {
  it('shows a validation error for a bad email and never calls the API', async () => {
    const fetchMock = vi.spyOn(global, 'fetch');
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts credentials to the BFF and redirects home on success', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ user: { id: 'u1' } }), { status: 200 }),
    );
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/email/i), 'admin@wallet.local');
    await userEvent.type(screen.getByLabelText(/password/i), 'ChangeMe123!');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ email: 'admin@wallet.local', password: 'ChangeMe123!' });
  });

  it('shows an error and does not redirect when credentials are rejected', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 401 }));
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/email/i), 'admin@wallet.local');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i);
    expect(push).not.toHaveBeenCalled();
  });
});
