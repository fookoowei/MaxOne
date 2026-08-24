import { setAuthCookies } from '@/lib/auth/session';
import { apiUrl } from '@/lib/api/base-url';

// Sign-up: the browser POSTs the new-account details here (same-origin), the BFF
// forwards them to NestJS, then turns the returned tokens into httpOnly cookies —
// so a successful sign-up logs the customer straight in. The browser never sees a token.
export async function POST(request: Request) {
  const body = await request.json();

  const res = await fetch(apiUrl('/auth/register'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
    }),
  });

  if (!res.ok) {
    // 409 = email already registered; surface a friendly message, keep the status.
    const message =
      res.status === 409 ? 'That email is already registered.' : 'Could not create your account.';
    return Response.json({ error: message }, { status: res.status });
  }

  const { user, tokens } = await res.json();
  await setAuthCookies(user, tokens);
  return Response.json({ user }, { status: 201 });
}
