import { setAuthCookies } from '@/lib/auth/session';
import { apiUrl } from '@/lib/api/base-url';

// Second login step: challenge (from /api/auth/login) + TOTP/recovery code → cookies.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const res = await fetch(apiUrl('/auth/login/2fa'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ challengeToken: body.challengeToken, code: body.code }),
  });
  if (!res.ok) return Response.json({ error: 'Invalid or expired code.' }, { status: res.status });
  const { user, tokens } = await res.json();
  await setAuthCookies(user, tokens);
  return Response.json({ user });
}
