import { serverApiWithRefresh } from '@/lib/api/server';

// Re-prove the second factor → a short-lived step-up grant for a sensitive action.
export async function POST(request: Request) {
  const b = await request.json().catch(() => ({}) as Record<string, unknown>);
  const res = await serverApiWithRefresh('/auth/step-up', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code: b.code }),
  });
  if (!res.ok) return new Response(null, { status: res.status });
  return Response.json(await res.json()); // { stepUpToken }
}
