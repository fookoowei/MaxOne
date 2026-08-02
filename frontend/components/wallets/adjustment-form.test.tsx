import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { AdjustmentForm } from './adjustment-form';

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('AdjustmentForm', () => {
  it('hides the form for a role without wallet.adjust', () => {
    render(<AdjustmentForm walletId="w1" role="support" />); // support: view only
    expect(screen.queryByRole('button', { name: /apply adjustment/i })).not.toBeInTheDocument();
    expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
  });

  it('blocks submit and calls no API when the note is empty', async () => {
    const fetchMock = vi.spyOn(global, 'fetch');
    render(<AdjustmentForm walletId="w1" role="finance" />);
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: /apply adjustment/i }));
    await waitFor(() => expect(screen.getByText(/note is required/i)).toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the adjustment and refreshes on success', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    render(<AdjustmentForm walletId="w1" role="finance" />);
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '5000' } });
    fireEvent.change(screen.getByLabelText(/note/i), { target: { value: 'bonus' } });
    fireEvent.click(screen.getByRole('button', { name: /apply adjustment/i }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/wallets/w1/adjustments',
      expect.objectContaining({ method: 'POST' }),
    );
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent).toEqual({ direction: 'credit', amount: 5000, note: 'bonus' });
  });
});
