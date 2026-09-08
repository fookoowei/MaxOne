import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a) } }));

import { RowActions } from './row-actions';

const subject = { type: 'deposit' as const, amount: 100000, currency: 'USD', walletName: 'Main', ownerEmail: 'jane@x' };
beforeEach(() => vi.clearAllMocks());

describe('RowActions (decisions behind dialogs)', () => {
  it('disables both actions when the role lacks the row-type permission', () => {
    render(<RowActions id="t1" subject={subject} role="support" />);
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
  });

  it('Approve opens a dialog that names the amount, wallet and owner; nothing is called until confirmed', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    render(<RowActions id="t1" subject={subject} role="finance" />);
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent(/approve deposit of/i);
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Main');
    expect(screen.getByRole('alertdialog')).toHaveTextContent('jane@x');
    expect(fetchSpy).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Approve deposit' }));
    expect(fetchSpy).toHaveBeenCalledWith('/api/transactions/t1/approve', expect.objectContaining({ method: 'POST' }));
    await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(toastSuccess).toHaveBeenCalledWith('Deposit approved');
  });

  it('Reject opens a dialog with a note and sends it', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    render(<RowActions id="t1" subject={subject} role="finance" />);
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await userEvent.type(await screen.findByLabelText(/note to the customer/i), 'Unverified source');
    await userEvent.click(screen.getByRole('button', { name: 'Reject deposit' }));
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/transactions/t1/reject');
    expect(JSON.parse(init.body as string)).toEqual({ note: 'Unverified source' });
    await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('a 409 becomes a toast, and the queue still refreshes (the row is gone either way)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{"code":"HTTP_409","message":"x"}', { status: 409, headers: { 'content-type': 'application/json' } }));
    render(<RowActions id="t1" subject={subject} role="finance" />);
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Approve deposit' }));
    await vi.waitFor(() => expect(toastError).toHaveBeenCalledWith('Already reviewed by someone else.', expect.anything()));
    expect(refresh).toHaveBeenCalled();
  });
});
