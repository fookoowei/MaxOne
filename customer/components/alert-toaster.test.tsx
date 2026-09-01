import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { AlertToaster } from './alert-toaster';

const handlers: Record<string, (p: unknown) => void> = {};
const socket = { on: (ev: string, cb: (p: unknown) => void) => { handlers[ev] = cb; }, disconnect: vi.fn() };
vi.mock('@/lib/realtime/socket', () => ({ connectSocket: () => socket }));

const toast = vi.fn();
vi.mock('sonner', () => ({ toast: (...args: unknown[]) => toast(...args) }));

beforeEach(() => {
  for (const k of Object.keys(handlers)) delete handlers[k];
  toast.mockReset();
  vi.restoreAllMocks();
  vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ticket: 't' }), { status: 200 }));
});

describe('AlertToaster', () => {
  it('fires a toast naming the symbol + target on alert.triggered', async () => {
    render(<AlertToaster />);
    await waitFor(() => expect(handlers['alert.triggered']).toBeTypeOf('function'));
    act(() =>
      handlers['alert.triggered']({ id: 'a1', symbol: 'BTC', direction: 'above', targetPrice: 80000, price: 80120 }),
    );
    expect(toast).toHaveBeenCalledTimes(1);
    expect(String(toast.mock.calls[0][0])).toContain('BTC');
  });
});
