import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WatchButton } from './watch-button';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

beforeEach(() => {
  refresh.mockReset();
  vi.restoreAllMocks();
});

describe('WatchButton', () => {
  it('follows: POSTs symbol/type then refreshes', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    render(<WatchButton symbol="BTC" type="crypto" followed={false} />);

    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(String(fetchSpy.mock.calls[0][0])).toBe('/api/watchlist');
    expect(JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      symbol: 'BTC',
      type: 'crypto',
    });
  });

  it('unfollows: DELETEs then refreshes', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    render(<WatchButton symbol="BTC" type="crypto" followed={true} />);

    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(String(fetchSpy.mock.calls[0][0])).toBe('/api/watchlist/BTC');
    expect((fetchSpy.mock.calls[0][1] as RequestInit).method).toBe('DELETE');
  });
});
