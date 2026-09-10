import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() } }));
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { MoneyRequestWizard } from './money-request-wizard';

beforeEach(() => {
  push.mockReset();
  toastError.mockReset();
  vi.restoreAllMocks();
});

describe('MoneyRequestWizard', () => {
  it('rejects a bad amount on step 1 and never leaves it', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    render(<MoneyRequestWizard mode="deposit" walletId="w1" currency="USD" balance={0} />);
    await userEvent.type(screen.getByLabelText(/amount to add/i), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText(/greater than 0/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('amount → review shows exactly what will be requested; Edit goes back with the value kept', async () => {
    render(<MoneyRequestWizard mode="deposit" walletId="w1" currency="USD" balance={0} />);
    await userEvent.click(screen.getByRole('button', { name: '$250.00' })); // quick chip fills the field
    await userEvent.type(screen.getByLabelText(/note/i), 'Salary top-up');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Salary top-up')).toBeInTheDocument();
    expect(screen.getByText('Instantly')).toBeInTheDocument(); // deposits no longer wait for review
    expect(screen.getByRole('button', { name: /add \$250\.00/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /edit amount/i }));
    expect(screen.getByLabelText(/amount to add/i)).toHaveValue('250.00');
  });

  it('review → POSTs cents + one idempotency key, then shows the receipt with a reference', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 'abcdef12-3456' }), { status: 201, headers: { 'content-type': 'application/json' } }));
    render(<MoneyRequestWizard mode="deposit" walletId="w1" currency="USD" balance={0} />);
    await userEvent.type(screen.getByLabelText(/amount to add/i), '50.50');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await userEvent.click(screen.getByRole('button', { name: /add \$50\.50/i }));
    expect(await screen.findByText('Money added')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('#ABCDEF12')).toBeInTheDocument();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/wallets/w1/deposits');
    expect(JSON.parse(init.body as string)).toMatchObject({ amount: 5050 });
    expect(init.headers).toMatchObject({ 'idempotency-key': expect.stringMatching(/^[0-9a-f-]{36}$/) });
    await userEvent.click(screen.getByRole('button', { name: /back to home/i }));
    expect(push).toHaveBeenCalledWith('/');
  });

  it('withdraw over the available balance is blocked on review, before any API call', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    render(<MoneyRequestWizard mode="withdraw" walletId="w1" currency="USD" balance={10000} />);
    await userEvent.type(screen.getByLabelText(/amount to withdraw/i), '150');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText(/more than your available balance of \$100\.00/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request \$150\.00 withdrawal/i })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('an API 400 on withdraw becomes the insufficient-funds toast and stays on review', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{"code":"HTTP_400","message":"x"}', { status: 400, headers: { 'content-type': 'application/json' } }));
    render(<MoneyRequestWizard mode="withdraw" walletId="w1" currency="USD" balance={1_000_000} />);
    await userEvent.type(screen.getByLabelText(/amount to withdraw/i), '9999');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await userEvent.click(screen.getByRole('button', { name: /request \$9,999\.00 withdrawal/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/insufficient funds/i), expect.anything()));
    expect(screen.queryByText('Request sent')).toBeNull();
  });

  it('withdrawals still say they wait for a reviewer', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 'abcdef12-3456' }), { status: 201, headers: { 'content-type': 'application/json' } }));
    render(<MoneyRequestWizard mode="withdraw" walletId="w1" currency="USD" balance={10000} />);
    await userEvent.type(screen.getByLabelText(/amount to withdraw/i), '20');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Reviewed by MaxOne')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /request \$20\.00 withdrawal/i }));
    expect(await screen.findByText('Request sent')).toBeInTheDocument();
    expect(screen.getByText('Pending review')).toBeInTheDocument();
  });
});
