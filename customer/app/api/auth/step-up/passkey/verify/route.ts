import { serverApiWithRefresh } from '@/lib/api/server';

export async function POST(request: Request) {
  const b = await request.json().catch(() => ({}) as Record<string, unknown>);
  const res = await serverApiWithRefresh('/auth/step-up/passkey/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ response: b.response, challengeToken: b.challengeToken }),
  });
  if (!res.ok) return new Response(null, { status: res.status });
  return Response.json(await res.json()); // { stepUpToken }
}
