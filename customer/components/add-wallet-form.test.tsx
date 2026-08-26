import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddWalletForm } from './add-wallet-form';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  push.mockReset();
  vi.restoreAllMocks();
});

describe('AddWalletForm', () => {
  it('creates the selected currency wallet and redirects', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ id: 'w2' }), { status: 200 }));
    render(<AddWalletForm held={['USD']} />);

    await userEvent.selectOptions(screen.getByLabelText(/currency/i), 'EUR');
    await userEvent.click(screen.getByRole('button', { name: /add wallet/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    expect(String(fetchSpy.mock.calls[0][0])).toBe('/api/wallets');
    expect(JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)).toEqual({ currency: 'EUR' });
  });
});
