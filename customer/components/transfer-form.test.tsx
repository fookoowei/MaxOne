import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransferForm } from './transfer-form';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  push.mockReset();
  vi.restoreAllMocks();
});

function mockFetch(handler: (url: string) => Response) {
  return vi.spyOn(global, 'fetch').mockImplementation((input) =>
    Promise.resolve(handler(String(input))),
  );
}

describe('TransferForm', () => {
  it('resolves a handle, then sends the transfer in cents and redirects', async () => {
    const fetchSpy = mockFetch((url) => {
      if (url.includes('/api/wallets/lookup')) {
        return new Response(
          JSON.stringify({ walletId: 'w2', currency: 'USD', recipientName: 'Alice Lee' }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ id: 't1' }), { status: 200 });
    });
    render(<TransferForm myWalletId="w1" myCurrency="USD" />);

    await userEvent.type(screen.getByLabelText(/handle/i), 'alice');
    await userEvent.click(screen.getByRole('button', { name: /find/i }));
    expect(await screen.findByText(/alice lee/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/amount/i), '50');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    const transferCall = fetchSpy.mock.calls.find(([u]) => String(u).includes('/transfers'))!;
    expect(String(transferCall[0])).toBe('/api/wallets/w1/transfers');
    expect(JSON.parse((transferCall[1] as RequestInit).body as string)).toMatchObject({
      toWalletId: 'w2',
      amount: 5000,
    });
  });

  it('blocks sending to yourself', async () => {
    mockFetch(() =>
      new Response(JSON.stringify({ walletId: 'w1', currency: 'USD', recipientName: 'Me Myself' }), {
        status: 200,
      }),
    );
    render(<TransferForm myWalletId="w1" myCurrency="USD" />);

    await userEvent.type(screen.getByLabelText(/handle/i), 'me');
    await userEvent.click(screen.getByRole('button', { name: /find/i }));

    expect(await screen.findByText(/can't send to yourself/i)).toBeInTheDocument();
  });

  it('shows an error when the handle is not found', async () => {
    mockFetch(() => new Response(null, { status: 404 }));
    render(<TransferForm myWalletId="w1" myCurrency="USD" />);

    await userEvent.type(screen.getByLabelText(/handle/i), 'ghost');
    await userEvent.click(screen.getByRole('button', { name: /find/i }));

    expect(await screen.findByText(/no one found/i)).toBeInTheDocument();
  });
});
