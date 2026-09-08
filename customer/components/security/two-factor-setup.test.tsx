import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TwoFactorSetup } from './two-factor-setup';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => vi.restoreAllMocks());

describe('TwoFactorSetup', () => {
  it('enable flow: setup → QR → verify → shows recovery codes once', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(json({ qrDataUrl: 'data:image/png;base64,qr', otpauthUrl: 'otpauth://x' }))
      .mockResolvedValueOnce(json({ recoveryCodes: ['aaaa111111', 'bbbb222222'] }));
    render(<TwoFactorSetup initialEnabled={false} />);

    await userEvent.click(screen.getByRole('button', { name: /enable 2fa/i }));
    expect(await screen.findByAltText(/scan with your authenticator/i)).toHaveAttribute('src', 'data:image/png;base64,qr');
    expect(String(fetchSpy.mock.calls[0][0])).toBe('/api/2fa/setup');

    await userEvent.type(screen.getByLabelText(/authentication code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify & enable/i }));

    expect(await screen.findByText('aaaa111111')).toBeInTheDocument();
    expect(screen.getByText('bbbb222222')).toBeInTheDocument();
    expect(JSON.parse((fetchSpy.mock.calls[1][1] as RequestInit).body as string)).toEqual({ code: '123456' });
  });

  it('shows the on-state when already enabled', () => {
    render(<TwoFactorSetup initialEnabled />);
    expect(screen.getByText(/two-factor authentication is on/i)).toBeInTheDocument();
  });
});
