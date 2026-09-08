import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { LiveBalance } from './live-balance';

// Capture the event handlers the component registers, so the test can fire events.
const handlers: Record<string, (p: unknown) => void> = {};
const socket = {
  on: (ev: string, cb: (p: unknown) => void) => {
    handlers[ev] = cb;
  },
  disconnect: vi.fn(),
};
vi.mock('@/lib/realtime/socket', () => ({ connectSocket: () => socket }));

beforeEach(() => {
  for (const k of Object.keys(handlers)) delete handlers[k];
  vi.restoreAllMocks();
  vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ticket: 't' }), { status: 200 }));
});

describe('LiveBalance', () => {
  it('shows the initial balance, then updates on a matching balance.updated event', async () => {
    render(<LiveBalance walletId="w1" currency="USD" initialBalance={5000} />);
    expect(screen.getByText('$50.00')).toBeInTheDocument();

    await waitFor(() => expect(handlers['balance.updated']).toBeTypeOf('function'));

    act(() => handlers['balance.updated']({ walletId: 'w1', currency: 'USD', balance: 9000 }));
    expect(await screen.findByText('$90.00')).toBeInTheDocument();
  });

  it('ignores events for a different wallet', async () => {
    render(<LiveBalance walletId="w1" currency="USD" initialBalance={5000} />);
    await waitFor(() => expect(handlers['balance.updated']).toBeTypeOf('function'));

    act(() => handlers['balance.updated']({ walletId: 'OTHER', currency: 'USD', balance: 9000 }));
    expect(screen.getByText('$50.00')).toBeInTheDocument();
  });
});
