import { setAuthCookies } from '@/lib/auth/session';
import { apiUrl } from '@/lib/api/base-url';
import { proxy } from '@/lib/api/proxy';
import { signupSchema } from '@/lib/schemas/auth';

// Sign-up: the browser POSTs the new-account details here (same-origin), the BFF
// forwards them to NestJS, then turns the returned tokens into httpOnly cookies —
// so a successful sign-up logs the customer straight in. The browser never sees a token.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  // The zod schema is the ONE list of sign-up fields. Forwarding `parsed.data` (not a
  // hand-typed allow-list) means adding a field to the form/schema forwards it here too —
  // the stale allow-list that dropped `handle` and 400'd every sign-up can't recur.
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { code: 'VALIDATION_FAILED', message: parsed.error.issues[0]?.message ?? 'Invalid sign-up details.' },
      { status: 400 },
    );
  }

  const res = await fetch(apiUrl('/auth/register'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(parsed.data),
  });

  // Unlike login, there's no enumeration risk to hide: sign-up MUST say when an email or
  // handle is taken. Forward the API's envelope (400 = which field, 409 = which is taken).
  if (!res.ok) return proxy(res);

  const { user, tokens } = await res.json();
  await setAuthCookies(user, tokens);
  return Response.json({ user }, { status: 201 });
}
