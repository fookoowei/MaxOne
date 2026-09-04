import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerPasskey, stepUpWithPasskey, loginWithPasskey } from './client';

const startRegistration = vi.fn();
const startAuthentication = vi.fn();
vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => true,
  startRegistration: (...a: unknown[]) => startRegistration(...a),
  startAuthentication: (...a: unknown[]) => startAuthentication(...a),
}));
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });

beforeEach(() => { vi.restoreAllMocks(); startRegistration.mockReset(); startAuthentication.mockReset(); });

describe('passkeys client', () => {
  it('registerPasskey: options → authenticator → verify with the challenge token + label', async () => {
    startRegistration.mockResolvedValue({ id: 'cred1' });
    const fetchSpy = vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(json({ options: { challenge: 'C' }, challengeToken: 'ct' }))
      .mockResolvedValueOnce(json({ id: 'pk1' }));
    expect(await registerPasskey('MacBook')).toBe(true);
    expect(startRegistration).toHaveBeenCalledWith({ optionsJSON: { challenge: 'C' } });
    expect(String(fetchSpy.mock.calls[1][0])).toBe('/api/passkeys/register/verify');
    expect(JSON.parse((fetchSpy.mock.calls[1][1] as RequestInit).body as string)).toEqual({ response: { id: 'cred1' }, challengeToken: 'ct', label: 'MacBook' });
  });
  it('stepUpWithPasskey returns the grant', async () => {
    startAuthentication.mockResolvedValue({ id: 'cred1' });
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(json({ options: {}, challengeToken: 'ct' }))
      .mockResolvedValueOnce(json({ stepUpToken: 'grant-pk' }));
    expect(await stepUpWithPasskey()).toBe('grant-pk');
  });
  it('loginWithPasskey is false when verify fails', async () => {
    startAuthentication.mockResolvedValue({ id: 'cred1' });
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(json({ options: {}, challengeToken: 'ct' }))
      .mockResolvedValueOnce(json({ error: 'x' }, 401));
    expect(await loginWithPasskey()).toBe(false);
  });
});
