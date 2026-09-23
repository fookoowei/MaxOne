import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockFetch } from '@/lib/test/mock-fetch';
import { ExchangeScreen } from './exchange-screen';

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


const amountField = (currency = 'USD') => screen.getByLabelText(`Amount in ${currency}`);

describe('ExchangeScreen', () => {
  it('quotes live as the amount is typed, then exchanges and shows the completed sheet', async () => {
    const fetchSpy = mockFetch((url) => {
      if (url.includes('/api/rates/quote')) {
        return new Response(JSON.stringify({ converted: 43890, rate: '0.87781' }), { status: 200 });
      }
      return new Response(JSON.stringify({ id: 't1' }), { status: 200 });
    });
    render(<ExchangeScreen wallets={wallets} />);

    const cta = screen.getByRole('button', { name: /exchange money/i });
    expect(cta).toBeDisabled();

    await userEvent.type(amountField(), '500');
    expect(amountField()).toHaveValue('500');

    expect(await screen.findByText('438.90')).toBeInTheDocument();
    expect(screen.getByText(/1 USD ≈ 0\.8778 EUR/)).toBeInTheDocument();
    const quoteCall = fetchSpy.mock.calls.find(([u]) => String(u).includes('/api/rates/quote'))!;
    expect(String(quoteCall[0])).toBe('/api/rates/quote?from=USD&to=EUR&amount=50000');

    await waitFor(() => expect(cta).toBeEnabled());
    await userEvent.click(cta);

    expect(await screen.findByText(/exchange completed/i)).toBeInTheDocument();
    const transferCall = fetchSpy.mock.calls.find(([u]) => String(u).includes('/transfers'))!;
    expect(String(transferCall[0])).toBe('/api/wallets/w1/transfers');
    const init = transferCall[1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({ toWalletId: 'w2', amount: 50000 });
    expect((init.headers as Record<string, string>)['idempotency-key']).toMatch(/[0-9a-f-]{36}/);

    await userEvent.click(screen.getByRole('button', { name: /go home/i }));
    expect(push).toHaveBeenCalledWith('/');
  });

  it('debounces: a burst of keys costs one quote request', async () => {
    const fetchSpy = mockFetch(() => new Response(JSON.stringify({ converted: 1, rate: '1' }), { status: 200 }));
    render(<ExchangeScreen wallets={wallets} />);
    await userEvent.type(amountField(), '123');
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 400));
    const quotes = fetchSpy.mock.calls.filter(([u]) => String(u).includes('/api/rates/quote'));
    expect(quotes).toHaveLength(1);
    expect(String(quotes[0][0])).toContain('amount=12300');
  });

  it('swaps the two sides and re-quotes the other way', async () => {
    const fetchSpy = mockFetch(() => new Response(JSON.stringify({ converted: 100, rate: '1.1' }), { status: 200 }));
    render(<ExchangeScreen wallets={wallets} />);
    expect(screen.getByRole('button', { name: 'From currency: USD' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /swap currencies/i }));
    expect(screen.getByRole('button', { name: 'From currency: EUR' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'To currency: USD' })).toBeInTheDocument();

    await userEvent.type(amountField('EUR'), '1');
    await waitFor(() => expect(fetchSpy.mock.calls.some(([u]) => String(u).includes('from=EUR&to=USD'))).toBe(true));
  });

  it('refuses more than the wallet holds', async () => {
    mockFetch(() => new Response(JSON.stringify({ converted: 1, rate: '1' }), { status: 200 }));
    render(<ExchangeScreen wallets={wallets} />);
    await userEvent.type(amountField(), '2000'); // $2,000 > $1,000 available
    expect(screen.getByText(/more than the USD you have/i)).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 400));
    expect(screen.getByRole('button', { name: /exchange money/i })).toBeDisabled();
  });

  it('keeps only what an amount can be while typing', async () => {
    mockFetch(() => new Response(JSON.stringify({ converted: 1, rate: '1' }), { status: 200 }));
    render(<ExchangeScreen wallets={wallets} />);
    await userEvent.type(amountField(), '1,2a.345');
    expect(amountField()).toHaveValue('12.34');
  });
});
