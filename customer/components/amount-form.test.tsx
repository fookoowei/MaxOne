import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AmountForm } from './amount-form';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  push.mockReset();
  vi.restoreAllMocks();
});

describe('AmountForm', () => {
  it('shows a validation error for a bad amount and does not submit', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    render(<AmountForm mode="deposit" walletId="w1" currency="USD" />);

    await userEvent.type(screen.getByLabelText(/amount/i), '0');
    await userEvent.click(screen.getByRole('button', { name: /request deposit/i }));

    expect(await screen.findByText(/greater than 0/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('POSTs the amount in cents to the deposits endpoint and redirects on success', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ id: 't1' }), { status: 200 }));
    render(<AmountForm mode="deposit" walletId="w1" currency="USD" />);

    await userEvent.type(screen.getByLabelText(/amount/i), '50.50');
    await userEvent.click(screen.getByRole('button', { name: /request deposit/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/wallets/w1/deposits');
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({ amount: 5050 });
    expect((init as RequestInit).headers).toMatchObject({ 'idempotency-key': expect.stringMatching(/^[0-9a-f-]{36}$/) });
  });

  it('surfaces an insufficient-funds error on a 400 withdrawal without redirecting', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 400 }));
    render(<AmountForm mode="withdraw" walletId="w1" currency="USD" />);

    await userEvent.type(screen.getByLabelText(/amount/i), '9999');
    await userEvent.click(screen.getByRole('button', { name: /request withdrawal/i }));

    expect(await screen.findByText(/insufficient funds/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
