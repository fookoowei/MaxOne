import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { RemoveAlertButton } from './remove-alert-button';

beforeEach(() => { refresh.mockReset(); vi.restoreAllMocks(); });

describe('RemoveAlertButton (confirm first)', () => {
  it('asks before deleting; DELETE happens only on confirm', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    render(<RemoveAlertButton id="a1" symbol="BTC" />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove alert' }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent(/remove the btc alert\?/i);
    expect(fetchSpy).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove alert' }));
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/api/alerts/a1', expect.objectContaining({ method: 'DELETE' })));
    await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});
