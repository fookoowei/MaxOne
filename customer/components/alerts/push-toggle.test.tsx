import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PushToggle } from './push-toggle';

const subscribeToPush = vi.fn().mockResolvedValue(true);
vi.mock('@/lib/push/subscribe', () => ({
  subscribeToPush: () => subscribeToPush(),
  unsubscribeFromPush: vi.fn(),
}));

beforeEach(() => {
  subscribeToPush.mockClear();
  vi.stubGlobal('Notification', { permission: 'default' });
});

describe('PushToggle', () => {
  it('shows Enable when permission is default and subscribes on click', async () => {
    render(<PushToggle />);
    const btn = screen.getByRole('button', { name: /enable/i });
    await userEvent.click(btn);
    expect(subscribeToPush).toHaveBeenCalled();
  });

  it('shows the on-state when permission is already granted', () => {
    vi.stubGlobal('Notification', { permission: 'granted' });
    render(<PushToggle />);
    expect(screen.getByRole('button', { name: /on/i })).toBeInTheDocument();
  });
});
