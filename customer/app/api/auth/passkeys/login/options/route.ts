import { apiUrl } from '@/lib/api/base-url';

// Public: usernameless sign-in starts before any session exists.
export async function POST() {
  const res = await fetch(apiUrl('/auth/passkeys/login/options'), { method: 'POST' });
  if (!res.ok) return new Response(null, { status: res.status });
  return Response.json(await res.json());
}
