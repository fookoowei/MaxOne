import { setAuthCookies } from '@/lib/auth/session';
import { apiUrl } from '@/lib/api/base-url';

// Passkey sign-in: verify the authenticator's response → cookies (no password, no TOTP step).
export async function POST(request: Request) {
  const b = await request.json().catch(() => ({}) as Record<string, unknown>);
  const res = await fetch(apiUrl('/auth/passkeys/login/verify'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ response: b.response, challengeToken: b.challengeToken }),
  });
  if (!res.ok) return Response.json({ error: 'Passkey sign-in failed.' }, { status: res.status });
  const { user, tokens } = await res.json();
  await setAuthCookies(user, tokens);
  return Response.json({ user });
}
