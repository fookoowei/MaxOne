import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddHoldingForm } from './add-holding-form';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const assets = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
];

beforeEach(() => {
  push.mockReset();
  vi.restoreAllMocks();
});

describe('AddHoldingForm', () => {
  it('posts the holding and redirects', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ id: 'h1' }), { status: 200 }));
    render(<AddHoldingForm assets={assets} />);

    await userEvent.selectOptions(screen.getByLabelText(/asset/i), 'ETH');
    await userEvent.type(screen.getByLabelText(/quantity/i), '2');
    await userEvent.type(screen.getByLabelText(/buy price/i), '1800');
    await userEvent.click(screen.getByRole('button', { name: /add holding/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/portfolio'));
    expect(String(fetchSpy.mock.calls[0][0])).toBe('/api/portfolio');
    expect(JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      symbol: 'ETH',
      type: 'crypto',
      quantity: 2,
      avgCost: 1800,
    });
  });
});
