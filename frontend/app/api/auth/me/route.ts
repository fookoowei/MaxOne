import { cookies } from 'next/headers';
import { ACCESS_COOKIE } from '@/lib/auth/cookie-names';
import { apiUrl } from '@/lib/api/base-url';

// Fresh identity check: forward the access cookie to NestJS as a Bearer token
// and pass the response through. Unlike the session_user cookie (a cached
// mirror for rendering), this reflects the backend's live view of the user.
export async function GET() {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;

  if (!accessToken) {
    return new Response(null, { status: 401 });
  }

  const res = await fetch(apiUrl('/auth/me'), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    return new Response(null, { status: res.status });
  }

  return Response.json(await res.json());
}
