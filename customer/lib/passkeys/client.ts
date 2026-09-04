import { browserSupportsWebAuthn, startAuthentication, startRegistration } from '@simplewebauthn/browser';

const JSON_HEADERS = { 'content-type': 'application/json' };

export function isPasskeySupported(): boolean {
  return typeof window !== 'undefined' && browserSupportsWebAuthn();
}

// Registration ceremony: options (server challenge) → authenticator → verify.
export async function registerPasskey(label?: string): Promise<boolean> {
  const o = await fetch('/api/passkeys/register/options', { method: 'POST' });
  if (!o.ok) return false;
  const { options, challengeToken } = await o.json();
  const response = await startRegistration({ optionsJSON: options });
  const v = await fetch('/api/passkeys/register/verify', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ response, challengeToken, label }),
  });
  return v.ok;
}

// Authentication ceremony shared by sign-in and step-up.
async function authenticate(optionsUrl: string, verifyUrl: string): Promise<Response> {
  const o = await fetch(optionsUrl, { method: 'POST' });
  if (!o.ok) throw new Error('Could not start passkey ceremony');
  const { options, challengeToken } = await o.json();
  const response = await startAuthentication({ optionsJSON: options });
  return fetch(verifyUrl, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ response, challengeToken }),
  });
}

// Usernameless sign-in — the BFF sets cookies on success.
export async function loginWithPasskey(): Promise<boolean> {
  const r = await authenticate('/api/auth/passkeys/login/options', '/api/auth/passkeys/login/verify');
  return r.ok;
}

// Step-up for a sensitive action → the grant to send as x-step-up-token (null on failure).
export async function stepUpWithPasskey(): Promise<string | null> {
  const r = await authenticate('/api/auth/step-up/passkey/options', '/api/auth/step-up/passkey/verify');
  if (!r.ok) return null;
  const { stepUpToken } = (await r.json()) as { stepUpToken: string };
  return stepUpToken;
}
