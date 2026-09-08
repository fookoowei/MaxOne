import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddAlertForm } from './add-alert-form';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const assets = [{ symbol: 'BTC', name: 'Bitcoin' }];

beforeEach(() => {
  push.mockReset();
  vi.restoreAllMocks();
});

describe('AddAlertForm', () => {
  it('posts the alert and redirects', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ id: 'a1' }), { status: 200 }));
    render(<AddAlertForm assets={assets} />);

    await userEvent.selectOptions(screen.getByLabelText(/direction/i), 'below');
    await userEvent.type(screen.getByLabelText(/target price/i), '70000');
    await userEvent.click(screen.getByRole('button', { name: /set alert/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/alerts'));
    expect(String(fetchSpy.mock.calls[0][0])).toBe('/api/alerts');
    expect(JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      symbol: 'BTC',
      type: 'crypto',
      targetPrice: 70000,
      direction: 'below',
    });
  });
});
