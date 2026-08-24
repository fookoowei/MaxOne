import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignupForm } from './signup-form';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  push.mockReset();
  vi.restoreAllMocks();
});

describe('SignupForm', () => {
  it('shows a validation error for a short password and does not submit', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    render(<SignupForm />);

    await userEvent.type(screen.getByLabelText(/first name/i), 'Alice');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Lee');
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'short');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('POSTs to the BFF and redirects to the dashboard on success', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ user: { id: 'u1' } }), { status: 201 }),
    );
    render(<SignupForm />);

    await userEvent.type(screen.getByLabelText(/first name/i), 'Alice');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Lee');
    await userEvent.type(screen.getByLabelText(/handle/i), 'alice');
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'Password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    const sent = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.handle).toBe('alice');
  });
});
