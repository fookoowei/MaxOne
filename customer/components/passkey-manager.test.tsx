import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasskeyManager } from './passkey-manager';

const registerPasskey = vi.fn();
vi.mock('@/lib/passkeys/client', () => ({
  isPasskeySupported: () => true,
  registerPasskey: (...a: unknown[]) => registerPasskey(...a),
}));

beforeEach(() => { registerPasskey.mockReset(); vi.restoreAllMocks(); });

describe('PasskeyManager', () => {
  it('adds a passkey with a label, then refreshes the list', async () => {
    registerPasskey.mockResolvedValue(true);
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([{ id: 'pk1', label: 'MacBook Touch ID', deviceType: 'singleDevice', createdAt: '2026-09-04T00:00:00Z' }]), { status: 200 }),
    );
    render(<PasskeyManager initial={[]} />);
    expect(screen.getByText(/no passkeys yet/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/name/i), 'MacBook Touch ID');
    await userEvent.click(screen.getByRole('button', { name: /add passkey/i }));

    expect(registerPasskey).toHaveBeenCalledWith('MacBook Touch ID');
    expect(await screen.findByText('MacBook Touch ID')).toBeInTheDocument();
  });
  it('removes a passkey', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    render(<PasskeyManager initial={[{ id: 'pk1', label: 'Old phone', deviceType: null, createdAt: '2026-09-04T00:00:00Z' }]} />);
    await userEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(await screen.findByText(/no passkeys yet/i)).toBeInTheDocument();
  });
});
