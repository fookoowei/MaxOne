import { serverApiWithRefresh } from '@/lib/api/server';

export async function POST(request: Request) {
  const b = await request.json().catch(() => ({}) as Record<string, unknown>);
  const res = await serverApiWithRefresh('/auth/2fa/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code: b.code }),
  });
  if (!res.ok) return new Response(null, { status: res.status });
  return Response.json(await res.json()); // { recoveryCodes } — shown once
}
