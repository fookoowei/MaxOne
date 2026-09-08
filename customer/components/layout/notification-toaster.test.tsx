import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { NotificationToaster } from './notification-toaster';

const handlers: Record<string, (p: unknown) => void> = {};
const socket = { on: (ev: string, cb: (p: unknown) => void) => { handlers[ev] = cb; }, disconnect: vi.fn() };
vi.mock('@/lib/realtime/socket', () => ({ connectSocket: () => socket }));
const toast = vi.fn();
vi.mock('sonner', () => ({ toast: (...a: unknown[]) => toast(...a) }));

beforeEach(() => {
  for (const k of Object.keys(handlers)) delete handlers[k];
  toast.mockReset();
  vi.restoreAllMocks();
  vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ticket: 't' }), { status: 200 }));
});

describe('NotificationToaster', () => {
  it('toasts title + body on a notification event', async () => {
    render(<NotificationToaster />);
    await waitFor(() => expect(handlers['notification']).toBeTypeOf('function'));
    act(() => handlers['notification']({ title: 'Received $50.00', body: 'from @alice' }));
    expect(toast).toHaveBeenCalledWith('Received $50.00', { description: 'from @alice' });
  });
});
