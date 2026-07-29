import { setAuthCookies } from '@/lib/auth/session';
import { apiUrl } from '@/lib/api/base-url';

// Login: the browser POSTs credentials here (same-origin), the BFF forwards
// them to NestJS, then turns the returned tokens into httpOnly cookies. The
// browser never sees a token — only the non-sensitive user object comes back.
export async function POST(request: Request) {
  const body = await request.json();

  const res = await fetch(apiUrl('/auth/login'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: body.email, password: body.password }),
  });

  if (!res.ok) {
    // Mirror the backend's status (401 on bad credentials); keep the message
    // vague so the endpoint can't be used to probe which emails exist.
    return Response.json({ error: 'Invalid email or password.' }, { status: res.status });
  }

  const { user, tokens } = await res.json();
  await setAuthCookies(user, tokens);
  return Response.json({ user });
}
