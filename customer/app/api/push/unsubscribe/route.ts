import { serverApiWithRefresh } from '@/lib/api/server';

export async function POST(request: Request) {
  const b = await request.json().catch(() => ({}) as Record<string, unknown>);
  const res = await serverApiWithRefresh('/push/unsubscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ endpoint: b.endpoint }),
  });
  return new Response(null, { status: res.ok ? 204 : res.status });
}
