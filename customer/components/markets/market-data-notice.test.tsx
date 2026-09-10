import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
import { MarketDataNotice } from './market-data-notice';

beforeEach(() => refresh.mockReset());

describe('MarketDataNotice', () => {
  it('explains the pause, links to the source, and retries on demand', async () => {
    render(<MarketDataNotice />);
    expect(screen.getByRole('status')).toHaveTextContent(/live market data is paused on this demo/i);
    expect(screen.getByRole('link', { name: /view on github/i })).toHaveAttribute('href', expect.stringContaining('github.com/fookoowei/MaxOne'));
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
