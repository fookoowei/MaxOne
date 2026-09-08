import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConvertForm } from './convert-form';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const wallets = [
  { id: 'w1', currency: 'USD', balance: 100000 },
  { id: 'w2', currency: 'EUR', balance: 0 },
];

beforeEach(() => {
  push.mockReset();
  vi.restoreAllMocks();
});

function mockFetch(handler: (url: string) => Response) {
  return vi.spyOn(global, 'fetch').mockImplementation((input) => Promise.resolve(handler(String(input))));
}

describe('ConvertForm', () => {
  it('quotes then converts (self-transfer) and redirects', async () => {
    const fetchSpy = mockFetch((url) => {
      if (url.includes('/api/rates/quote')) {
        return new Response(JSON.stringify({ converted: 43890, rate: '0.87781' }), { status: 200 });
      }
      return new Response(JSON.stringify({ id: 't1' }), { status: 200 });
    });
    render(<ConvertForm wallets={wallets} />);

    await userEvent.type(screen.getByLabelText(/amount/i), '500');
    await userEvent.click(screen.getByRole('button', { name: /get quote/i }));

    expect(await screen.findByText(/€438\.90/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /convert/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    const transferCall = fetchSpy.mock.calls.find(([u]) => String(u).includes('/transfers'))!;
    expect(String(transferCall[0])).toBe('/api/wallets/w1/transfers');
    expect(JSON.parse((transferCall[1] as RequestInit).body as string)).toMatchObject({
      toWalletId: 'w2',
      amount: 50000,
    });
  });
});
